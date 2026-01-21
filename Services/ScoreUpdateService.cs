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

    // Cache per activePlayerIds (evita query Contracts ogni 2 minuti)
    private List<int> _cachedActivePlayerIds = new();
    private DateTime _lastContractRefresh = DateTime.MinValue;
    
    // Throttling NBA Logic
    private DateTime _lastNbaUpdate = DateTime.MinValue;
    private bool _areGamesLive = false;
    private DateTime _lastScoreRefresh = DateTime.MinValue;

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
            // 1. PROCESSA ASTE (Sempre, ogni minuto)
            // Questo deve essere veloce e indipendente dagli aggiornamenti NBA
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var auctionService = scope.ServiceProvider.GetRequiredService<AuctionService>();
                    await auctionService.ProcessExpiredAuctionsAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel processamento aste.");
            }

            // 2. NBA LOGIC (Throttled: Se live RUN, altrimenti ogni 5 min)
            try
            {
                // Esegui se partite live (già attive) OR se passati 5 min (check periodico)
                if (_areGamesLive || DateTime.UtcNow > _lastNbaUpdate.AddMinutes(5))
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var nbaService = scope.ServiceProvider.GetRequiredService<INbaDataService>();
                        var matchupService = scope.ServiceProvider.GetRequiredService<MatchupService>();
                        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                        var injuryService = scope.ServiceProvider.GetRequiredService<OfficialInjuryService>();

                        // FIX Timezone: Usiamo -12h per gestire partite notturne che a UTC sono il giorno dopo
                        var today = DateTime.UtcNow.AddHours(-12).Date;

                        // 1. CONTROLLO PARTITE LIVE
                        // Nota: Status contiene testo grezzo API. Se contiene "pm/am/ET" è futuro. Se NON è Final e non orario => LIVE/HalfTime/Qx
                        bool checkLive = await context.NbaGames
                            .AnyAsync(g => g.GameDate == today && 
                                           g.Status != "Final" && 
                                           !g.Status.Contains("pm") && 
                                           !g.Status.Contains("am") &&
                                           !g.Status.Contains("ET"), 
                                      stoppingToken);
                        
                        // Aggiorniamo stato interno
                        _areGamesLive = checkLive;

                        if (_areGamesLive)
                        {
                            // --- MODALITÀ LIVE ---
                            // _logger.LogInformation("Partite in corso: aggiornamento LIVE attivo.");

                            // A. Scarica punteggi
                            // OPTIMIZATION: Cache activePlayerIds for 15 minutes to reduce DB reads
                            if (!_cachedActivePlayerIds.Any() || DateTime.UtcNow > _lastContractRefresh.AddMinutes(15))
                            {
                                _cachedActivePlayerIds = await context.Contracts.Select(c => c.PlayerId).Distinct().ToListAsync(stoppingToken);
                                _lastContractRefresh = DateTime.UtcNow;
                            }

                            if (_cachedActivePlayerIds.Any())
                            {
                                await nbaService.GetFantasyPointsByDate(today, _cachedActivePlayerIds);
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
                            // Eseguiamo ogni volta che entriamo qui (quindi ogni 5 min circa)

                            // 0. POST-GAME REFRESH (Ogni 10 Minuti)
                            // Serve per catturare i punteggi "Final" appena finiti e correzioni
                            if (DateTime.UtcNow > _lastScoreRefresh.AddMinutes(10))
                            {
                                _logger.LogInformation("Performing post-game score refresh (Final Stats / Corrections)...");

                                // Ensure caching is populated
                                if (!_cachedActivePlayerIds.Any() || DateTime.UtcNow > _lastContractRefresh.AddMinutes(15))
                                {
                                    _cachedActivePlayerIds = await context.Contracts.Select(c => c.PlayerId).Distinct().ToListAsync(stoppingToken);
                                    _lastContractRefresh = DateTime.UtcNow;
                                }

                                if (_cachedActivePlayerIds.Any())
                                {
                                     // Oggi (Final)
                                     await nbaService.GetFantasyPointsByDate(today, _cachedActivePlayerIds);
                                     // Ieri (Corrections)
                                     await nbaService.GetFantasyPointsByDate(today.AddDays(-1), _cachedActivePlayerIds);
                                }

                                // Aggiorna Leghe
                                var leagueIds = await context.Leagues.Select(l => l.Id).ToListAsync(stoppingToken);
                                foreach (var leagueId in leagueIds)
                                {
                                    await matchupService.UpdateLiveScores(leagueId);
                                }

                                _lastScoreRefresh = DateTime.UtcNow;
                            }

                            // Aggiorniamo calendario e infortuni solo ogni 6 ore
                            if (DateTime.UtcNow > _lastFullScheduleUpdate.AddHours(6))
                            {
                                _logger.LogInformation("Esecuzione manutenzione periodica (6h) (Calendario/Infortuni/Giocatori).");
                                
                                // Sync Giocatori
                                await nbaService.SyncPlayersAsync();
                                _lastPlayerSync = DateTime.UtcNow;

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
                                     await nbaService.GetFantasyPointsByDate(today, activePlayerIds);
                                }
                                
                                // Aggiorna totali leghe e finalizza matchup
                                var leagueIds = await context.Leagues.Select(l => l.Id).ToListAsync(stoppingToken);
                                foreach (var leagueId in leagueIds)
                                {
                                    await matchupService.UpdateLiveScores(leagueId);
                                }

                                _logger.LogInformation("Verifica e finalizzazione matchup conclusi...");
                                await matchupService.ProcessCompletedMatchups(stoppingToken);

                                _lastFullScheduleUpdate = DateTime.UtcNow;
                            }
                        }

                        // Aggiorniamo timestamp esecuzione
                        _lastNbaUpdate = DateTime.UtcNow;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel ciclo NBA Smart Worker.");
            }

            // CRITICAL: Loop sempre di 1 minuto per garantire reattività Aste
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}