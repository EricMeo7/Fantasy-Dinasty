using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace FantasyBasket.API.Services;

public class ScoreUpdateService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScoreUpdateService> _logger;
    private readonly IHubContext<FantasyBasket.API.Hubs.MatchupHub> _hubContext;
    
    // Trackers per evitare chiamate inutili
    private DateTime _lastPlayerSync = DateTime.MinValue;
    private DateTime _lastFullScheduleUpdate = DateTime.MinValue;

    public ScoreUpdateService(IServiceProvider serviceProvider, ILogger<ScoreUpdateService> logger, IHubContext<FantasyBasket.API.Hubs.MatchupHub> hubContext)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Score Update Service (Smart Worker) avviato.");

        // ==============================================================================
        // FASE 1: BOOTSTRAP (All'avvio)
        // ==============================================================================
        try
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var nbaService = scope.ServiceProvider.GetRequiredService<INbaDataService>();
                // Scarichiamo il calendario solo se serve (o forziamo all'avvio per sicurezza)
                await nbaService.ImportSeasonScheduleAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Errore durante il download iniziale del calendario NBA.");
        }

        // ==============================================================================
        // FASE 2: LOOP INTELLIGENTE
        // ==============================================================================
        while (!stoppingToken.IsCancellationRequested)
        {
            int delayMinutes = 15; // Default: modalità risparmio (nessuna partita)

            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var nbaService = scope.ServiceProvider.GetRequiredService<INbaDataService>();
                    var matchupService = scope.ServiceProvider.GetRequiredService<MatchupService>();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var auctionService = scope.ServiceProvider.GetRequiredService<AuctionService>();
                    var injuryService = scope.ServiceProvider.GetRequiredService<OfficialInjuryService>();

                    var today = DateTime.UtcNow.Date;

                    // 1. CONTROLLO PARTITE LIVE (Query leggera al DB)
                    // Nota: Status contiene testo grezzo API (es. "Final", "7:00 pm ET", "Q4 10:00").
                    // Una partita è LIVE se NON è "Final" e NON contiene l'orario (che indica futuro).
                    bool areGamesLive = await context.NbaGames
                        .AnyAsync(g => g.GameDate == today && 
                                       g.Status != "Final" && 
                                       !g.Status.Contains("pm") && 
                                       !g.Status.Contains("am") &&
                                       !g.Status.Contains("ET"), 
                                  stoppingToken);

                    // ==================================================================
                    // LOGICA DI AGGIORNAMENTO
                    // ==================================================================

                    if (areGamesLive)
                    {
                        // --- MODALITÀ LIVE ---
                        // Aggiorniamo frequentemente perché si sta giocando
                        delayMinutes = 2; 
                        // _logger.LogInformation("Partite in corso: aggiornamento LIVE attivo.");

                        // A. Scarica punteggi (SOLO di oggi per velocità)
                        var activePlayerIds = await context.Contracts.Select(c => c.PlayerId).Distinct().ToListAsync(stoppingToken);
                        if (activePlayerIds.Any())
                        {
                            await nbaService.GetFantasyPointsByDate(today, activePlayerIds);
                        }

                        // B. Aggiorna i totali delle Leghe e Notifica via SignalR
                        var leagueIds = await context.Leagues.Select(l => l.Id).ToListAsync(stoppingToken);
                        foreach (var leagueId in leagueIds)
                        {
                            await matchupService.UpdateLiveScores(leagueId);
                            if (_hubContext != null)
                                await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("ReceiveScoreUpdate", stoppingToken);
                        }

                        // C. Aggiorna stato partite (per sapere quando finiscono)
                        await nbaService.UpdateDailyNbaSchedule(today);
                    }
                    else
                    {
                        // --- MODALITÀ MANUTENZIONE (Off-hours) ---
                        // Nessuna partita live. Facciamo manutenzione o controlliamo aste.
                        
                        delayMinutes = 5; 

                        // Aggiorniamo calendario e infortuni solo ogni 60 minuti (o se non fatto da molto)
                        if (DateTime.UtcNow > _lastFullScheduleUpdate.AddMinutes(60))
                        {
                            _logger.LogInformation("Esecuzione manutenzione oraria (Calendario/Infortuni/Giocatori).");
                            
                            // Sync Giocatori (una volta al giorno)
                            if (today > _lastPlayerSync.Date)
                            {
                                await nbaService.SyncPlayersAsync();
                                _lastPlayerSync = DateTime.UtcNow;
                            }

                            // Update Calendario completo
                            await nbaService.UpdateDailyNbaSchedule(today.AddDays(-1));
                            await nbaService.UpdateDailyNbaSchedule(today);
                            await nbaService.UpdateDailyNbaSchedule(today.AddDays(1));

                            // Update Infortuni
                            await injuryService.UpdateInjuriesFromOfficialReportAsync();

                            // Scarichiamo punteggi finali di ieri (per sicurezza) e oggi
                            var activePlayerIds = await context.Contracts.Select(c => c.PlayerId).Distinct().ToListAsync(stoppingToken);
                             if (activePlayerIds.Any())
                             {
                                 await nbaService.GetFantasyPointsByDate(today.AddDays(-1), activePlayerIds);
                                 // Rigeneriamo anche oggi anche se non live, magari qualcuno è passato a Final
                                 await nbaService.GetFantasyPointsByDate(today, activePlayerIds);
                             }
                            
                            // Aggiorna anche i totali leghe un'ultima volta per i Final scores
                            var leagueIds = await context.Leagues.Select(l => l.Id).ToListAsync(stoppingToken);
                            foreach (var leagueId in leagueIds)
                            {
                                await matchupService.UpdateLiveScores(leagueId);
                            }

                            // --- FIX: FINALIZZA MATCHUP SCADUTI E AGGIORNA CLASSIFICHE ---
                            _logger.LogInformation("Verifica e finalizzazione matchup conclusi...");
                            await matchupService.ProcessCompletedMatchups(stoppingToken);
                            // -------------------------------------------------------------

                            _lastFullScheduleUpdate = DateTime.UtcNow;
                        }
                    }

                    // 2. PROCESSA ASTE (Sempre, ogni ciclo)
                    // È un'operazione DB locale veloce, non costa API esterne
                    await auctionService.ProcessExpiredAuctionsAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel ciclo Smart Worker.");
                delayMinutes = 5; // In caso di errore riprova tra 5 min
            }

            // Attesa dinamica
            await Task.Delay(TimeSpan.FromMinutes(delayMinutes), stoppingToken);
        }
    }
}