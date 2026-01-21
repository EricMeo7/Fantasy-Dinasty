using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using Microsoft.AspNetCore.SignalR;
using FantasyBasket.API.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Concurrent;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Services;

public class DraftState
{
    public int LeagueId { get; set; }
    public bool IsActive { get; set; } = false;
    public List<string> Participants { get; set; } = new(); // UserIds
    // Nuova property per tracciare chi è online
    public List<string> OnlineParticipants { get; set; } = new(); 
    public int CurrentTurnIndex { get; set; } = 0;

    // Stato Asta Attuale
    public int? CurrentPlayerId { get; set; }
    public string CurrentPlayerName { get; set; } = "";
    public double CurrentBidTotal { get; set; }
    public int CurrentBidYears { get; set; } = 1;
    public double CurrentBidYear1 { get; set; }
    public string HighBidderId { get; set; } = "";
    public string HighBidderName { get; set; } = "";
    public DateTime BidEndTime { get; set; }

    public List<TeamDraftSummaryDto> Teams { get; set; } = new();
}

public class LiveDraftService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<DraftHub> _hubContext;

    // Gestione Multi-Lega: Un dizionario di stati, chiave = LeagueId
    private readonly ConcurrentDictionary<int, DraftState> _leagueStates = new();
    private readonly ConcurrentDictionary<int, Timer> _leagueTimers = new();
    
    // Gestione Concorrenza (Race Conditions Fix)
    private readonly ConcurrentDictionary<int, SemaphoreSlim> _leagueLocks = new();
    
    // Presence Tracking: LeagueId -> Set of UserIds
    private readonly ConcurrentDictionary<int, HashSet<string>> _onlineUsers = new();

    public LiveDraftService(IServiceScopeFactory scopeFactory, IHubContext<DraftHub> hubContext)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
    }

    // Helper per ottenere (o creare) il lock per una lega specifica
    private SemaphoreSlim GetLock(int leagueId)
    {
        return _leagueLocks.GetOrAdd(leagueId, _ => new SemaphoreSlim(1, 1));
    }

    // Recupera lo stato di una lega (o ne crea uno vuoto se non esiste)
    public DraftState GetState(int leagueId)
    {
        var state = _leagueStates.GetOrAdd(leagueId, new DraftState { LeagueId = leagueId });
        // Aggiorna la lista online live dal tracker
        if (_onlineUsers.TryGetValue(leagueId, out var onlineSet))
        {
            state.OnlineParticipants = onlineSet.ToList();
        }
        else
        {
             state.OnlineParticipants = new List<string>();
        }
        return state;
    }

    public async Task UserConnectedAsync(int leagueId, string userId)
    {
        var onlineSet = _onlineUsers.GetOrAdd(leagueId, _ => new HashSet<string>());
        lock(onlineSet) 
        {
            onlineSet.Add(userId);
        }

        // Fix: Force refresh every time a user connects to ensure the Team List is up to date with DB.
        // This solves the issue where UI shows 1/1 but DB has 2 teams (Stale State).
        var state = GetState(leagueId);
        await RefreshTeamSummariesInternal(leagueId, state);

        await BroadcastState(leagueId);
    }

    public async Task UserDisconnectedAsync(int leagueId, string userId)
    {
        if (_onlineUsers.TryGetValue(leagueId, out var onlineSet))
        {
            lock(onlineSet)
            {
                onlineSet.Remove(userId);
            }
            await BroadcastState(leagueId);
        }
    }

    public async Task StartDraftAsync(int leagueId, List<string> participantIds)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            var state = GetState(leagueId);
            state.IsActive = true;
            state.Participants = participantIds;
            state.CurrentTurnIndex = 0;

            await RefreshTeamSummariesInternal(leagueId, state); // Calcola budget iniziali
            ResetRoundInternal(leagueId);
        }
        finally
        {
            semaphore.Release();
        }

        await BroadcastState(leagueId);
    }

    private async Task RefreshTeamSummariesInternal(int leagueId, DraftState state)
    {
        using (var scope = _scopeFactory.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // 1. Recupera la Lega per il Cap (Cruciale: Fallback consistente con AuctionService)
            var league = await context.Leagues.FindAsync(leagueId);
            if (league == null) return;

            double cap = league.SalaryCap;
            string currentSeason = league.CurrentSeason; 

            // 2. Recupera i Teams di QUESTA lega
            var teams = await context.Teams
                .Where(t => t.LeagueId == leagueId)
                .AsNoTracking()
                .ToListAsync();

            var teamIds = teams.Select(t => t.Id).ToList();
            var teamUserIds = teams.Select(t => t.UserId).ToList();

            // 3. BULK LOADING: Carica contratti solo di QUESTI team (Fix join parity)
            var allContracts = await context.Contracts
                .Where(c => teamIds.Contains(c.TeamId))
                .Include(c => c.Player)
                .AsNoTracking()
                .ToListAsync();

            // 4. BULK LOADING: Carica Dead Money (Stessa logica di AuctionService.GetTeamCapSpace)
            var allDeadCaps = await context.DeadCaps
                .Where(d => d.LeagueId == leagueId && d.Season == currentSeason && teamUserIds.Contains(d.TeamId))
                .AsNoTracking()
                .ToListAsync();

            // 5. BULK LOADING: Carica TUTTE le aste attive nel mercato (Per allineamento con Roster page)
            var allMarketAuctions = await context.Auctions
                .Where(a => a.LeagueId == leagueId && a.IsActive)
                .AsNoTracking()
                .ToListAsync();

            var summaries = new List<TeamDraftSummaryDto>();

            foreach (var team in teams)
            {
                // Filtra in memoria
                var teamContracts = allContracts.Where(c => c.TeamId == team.Id).ToList();
                double committedSalaries = teamContracts.Sum(c => c.SalaryYear1);
                
                double deadMoney = allDeadCaps.Where(d => d.TeamId == team.UserId).Sum(d => d.Amount);

                // Soldi congelati nell'asta LIVE corrente (Se sei l'attuale vincitore)
                double frozenLiveBid = (state.HighBidderId == team.UserId) ? state.CurrentBidYear1 : 0;

                // Soldi congelati nel MERCATO (Aggiunto per allineamento con Roster.tsx / useTeamBudget)
                double frozenMarketBid = allMarketAuctions.Where(a => a.HighBidderId == team.UserId).Sum(a => a.CurrentYear1Amount);
                
                summaries.Add(new TeamDraftSummaryDto
                {
                    UserId = team.UserId,
                    TeamName = team.Name,
                    // Calcolo identico a AuctionService.GetTeamCapSpace
                    RemainingBudget = cap - (committedSalaries + deadMoney + frozenLiveBid + frozenMarketBid),
                    RosterCount = teamContracts.Count,
                    Players = teamContracts.OrderByDescending(c => c.SalaryYear1)
                                           .Select(c => new DraftPlayerDto
                                           {
                                               Name = c.Player.LastName,
                                               Salary = c.SalaryYear1,
                                               Position = c.Player.Position
                                           })
                                           .ToList()
                });
            }

            state.Teams = summaries.OrderByDescending(t => t.RemainingBudget).ToList();
        }
    }

    public async Task NominatePlayerAsync(int leagueId, int playerId, string playerName, double amount, int years, string userId, string userName)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync(); // Critical Section Start
        try
        {
            var state = GetState(leagueId);

            // Controllo turno
            if (state.Participants.Count > 0 && state.Participants[state.CurrentTurnIndex] != userId)
                throw new Exception(ErrorCodes.NOT_YOUR_TURN);
            
            // Controllo se un'asta è già in corso (Double Check Locking)
            if (state.CurrentPlayerId != null)
                 throw new Exception(ErrorCodes.AUCTION_IN_PROGRESS);

            double year1 = Math.Floor(amount / years);
            
            // Controllo Cap Iniziale (Nomina)
            var nominatorTeam = state.Teams.FirstOrDefault(t => t.UserId == userId); // Nota: Teams è aggiornato al momento precedente
            double currentAvailable = nominatorTeam?.RemainingBudget ?? 0;
            
            using (var scope = _scopeFactory.CreateScope())
            {
                var auctionService = scope.ServiceProvider.GetRequiredService<AuctionService>();
                
                // --- ROSTER LIMIT VALIDATION ---
                var rosterValidation = await auctionService.ValidateRosterLimitsAsync(userId, leagueId, playerId);
                if (!rosterValidation.IsSuccess)
                {
                    throw new Exception(rosterValidation.Error);
                }

                double minBid = await auctionService.GetBaseAuctionPriceAsync(playerId, leagueId);
                
                if (amount < minBid)
                {
                    throw new Exception(ErrorCodes.MIN_BID_NOT_MET);
                }
            }

            if (currentAvailable < year1) throw new Exception(ErrorCodes.INSUFFICIENT_BUDGET);

            state.CurrentPlayerId = playerId;
            state.CurrentPlayerName = playerName;
            state.CurrentBidTotal = amount;
            state.CurrentBidYears = years;
            state.CurrentBidYear1 = year1;
            state.HighBidderId = userId;
            state.HighBidderName = userName;

            // Aggiorna stato
            await RefreshTeamSummariesInternal(leagueId, state);
            ResetTimerInternal(leagueId);
        }
        finally
        {
            semaphore.Release(); // Critical Section End
        }

        await BroadcastState(leagueId);
    }

    public async Task PlaceBidAsync(int leagueId, double totalAmount, int years, string userId, string userName)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync(); // Critical Section Start
        try
        {
            var state = GetState(leagueId);
            if (state.CurrentPlayerId == null) throw new Exception(ErrorCodes.AUCTION_NOT_FOUND);

            double newYear1 = Math.Floor(totalAmount / years);

            // Validazione Offerta STRICT (Prevents Race Condition Overwrites)
            bool isValid = false;
            // Regole rilancio:
            // 1. Offerta annuale maggiore
            // 2. Offerta annuale uguale MA più anni (es. 10x3 vince su 10x2)
            if (newYear1 > state.CurrentBidYear1) isValid = true;
            else if (newYear1 == state.CurrentBidYear1 && years > state.CurrentBidYears) isValid = true;

            if (!isValid) throw new Exception(ErrorCodes.BID_TOO_LOW);

            // --- STRICT CAP ENFORCEMENT ---
            var bidderTeam = state.Teams.FirstOrDefault(t => t.UserId == userId);
            
            // Il 'RemainingBudget' nello stato NON include i soldi congelati se stavo vincendo.
            // Quindi per calcolare il mio VERO massimale ("quanto ho in banca"), devo sommare back i soldi congelati se sono io l'attuale vincitore.
            
            double bankBalance = bidderTeam?.RemainingBudget ?? 0;
            if (state.HighBidderId == userId)
            {
                // Se ero già io il vincitore, 'RemainingBudget' era stato ridotto della mia vecchia offerta.
                // Ora che sto rilanciando (es. cambio anni o alzo posta), quei soldi tornano disponibili per coprire la NUOVA offerta.
                bankBalance += state.CurrentBidYear1;
            }

            if (bankBalance < newYear1) 
            {
                // FAIL
                throw new Exception(ErrorCodes.INSUFFICIENT_BUDGET);
            }

            // --- ROSTER LIMIT VALIDATION ---
            using (var scope = _scopeFactory.CreateScope())
            {
                var auctionService = scope.ServiceProvider.GetRequiredService<AuctionService>();
                var rosterValidation = await auctionService.ValidateRosterLimitsAsync(userId, leagueId, state.CurrentPlayerId);
                if (!rosterValidation.IsSuccess)
                {
                    throw new Exception(rosterValidation.Error);
                }
            }

            state.CurrentBidTotal = totalAmount;
            state.CurrentBidYears = years;
            state.CurrentBidYear1 = newYear1;
            state.HighBidderId = userId;
            state.HighBidderName = userName;

            await RefreshTeamSummariesInternal(leagueId, state);
            ResetTimerInternal(leagueId);
        }
        finally
        {
            semaphore.Release(); // Critical Section End
        }

        await BroadcastState(leagueId);
    }

    private void ResetTimerInternal(int leagueId)
    {
        var state = GetState(leagueId);
        state.BidEndTime = DateTime.UtcNow.AddSeconds(60);

        // Gestione Timer Multi-Lega
        if (_leagueTimers.TryRemove(leagueId, out var oldTimer))
        {
            oldTimer.Dispose();
        }

        // Timer specifico per questa lega
        var newTimer = new Timer(async _ => await OnTimerExpired(leagueId), null, 60000, Timeout.Infinite);
        _leagueTimers[leagueId] = newTimer; // ConcurrentDictionary is thread-safe
    }

    private async Task OnTimerExpired(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync(); // Critical Section Start
        
        bool timerActuallyExpired = false;
        DraftState state = null!;

        try 
        {
            state = GetState(leagueId);
            
            // Check se il timer è "vero" o se è stato resettato nel frattempo da un bid last-second che ha acquisito il lock prima
            // (La Timer callback è fire-and-forget, potrebbe arrivare in ritardo)
            if (DateTime.UtcNow < state.BidEndTime.AddSeconds(-1)) // -1 buffer
            {
                // False alarm, il timer è stato esteso
                return;
            }

            timerActuallyExpired = true;

            if (state.CurrentPlayerId.HasValue)
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    // 1. Trova il Team del vincitore in questa lega
                    var winnerTeam = await context.Teams
                        .FirstOrDefaultAsync(t => t.UserId == state.HighBidderId && t.LeagueId == leagueId);

                    if (winnerTeam != null)
                    {
                        // 2. Crea il Contratto
                        double total = state.CurrentBidTotal;
                        int years = state.CurrentBidYears;
                        double baseSal = Math.Floor(total / years);
                        double remainder = total - (baseSal * years);

                        var contract = new Contract
                        {
                            TeamId = winnerTeam.Id,
                            PlayerId = state.CurrentPlayerId.Value,
                            ContractYears = years,
                            SalaryYear1 = baseSal,
                            SalaryYear2 = (years >= 2) ? baseSal : 0,
                            SalaryYear3 = (years == 3) ? baseSal + remainder : (years == 2 ? remainder : 0)
                            // NOTA: IsStarter rimosso, ora esiste solo in DailyLineup
                        };

                        context.Contracts.Add(contract);

                        // Rimuovi eventuali aste pendenti su Auction table (pulizia)
                        var existingAuction = await context.Auctions.FirstOrDefaultAsync(a => a.PlayerId == state.CurrentPlayerId);
                        if (existingAuction != null) context.Auctions.Remove(existingAuction);

                        await context.SaveChangesAsync();
                    }
                }
            }
            
            // Turno successivo
             if (state.Participants.Count > 0)
                state.CurrentTurnIndex = (state.CurrentTurnIndex + 1) % state.Participants.Count;

            await RefreshTeamSummariesInternal(leagueId, state);
            
            // Salva info per notifica PRIMA del reset
            var notifPlayer = state.CurrentPlayerName;
            var notifWinner = state.HighBidderName;
            var notifAmount = state.CurrentBidTotal;
            bool wasSold = state.CurrentPlayerId.HasValue;

            ResetRoundInternal(leagueId);
            
            // Fuori dal lock invieremo la notifica
            if (wasSold) 
            {
                 _ = _hubContext.Clients.Group($"League_{leagueId}").SendAsync("PlayerSold", new
                {
                    PlayerName = notifPlayer,
                    Winner = notifWinner,
                    Amount = notifAmount
                });
            }
        }
        finally
        {
            semaphore.Release();
        }

        if (timerActuallyExpired)
        {
            await BroadcastState(leagueId);
        }
    }

    private void ResetRoundInternal(int leagueId)
    {
        var state = GetState(leagueId);
        state.CurrentPlayerId = null;
        state.CurrentPlayerName = "";
        state.CurrentBidTotal = 0;
        state.CurrentBidYears = 1;
        state.CurrentBidYear1 = 0;
        state.HighBidderId = "";
        state.HighBidderName = "";

        if (_leagueTimers.TryRemove(leagueId, out var timer))
        {
            timer.Dispose();
        }
    }

    public async Task PauseDraftAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            var state = GetState(leagueId);
            state.IsActive = false; // Torna in Lobby
            
            // Fix: Completamente resetta l'asta corrente per liberare il budget congelato
            if (state.CurrentPlayerId != null) 
            {
                // Usa ResetRoundInternal per pulire anche HighBidderId e CurrentBidYear1
                ResetRoundInternal(leagueId);
                
                // Opzionale: Ricalcola subito i budget per riflettere lo sblocco
                await RefreshTeamSummariesInternal(leagueId, state);
            }
            else
            {
                // Se non c'era asta, comunque assicuriamoci che il timer sia spento
                if (_leagueTimers.TryRemove(leagueId, out var timer))
                {
                    timer.Dispose();
                }
            }
        }
        finally
        {
            semaphore.Release();
        }
        await BroadcastState(leagueId);
    }

    public async Task ResetCurrentAuctionAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            var state = GetState(leagueId);
            // Forza lo stop dell'asta corrente senza assegnare il giocatore
            ResetRoundInternal(leagueId);
            
            // Ricalcola i budget (i soldi congelati tornano disponibili)
            await RefreshTeamSummariesInternal(leagueId, state);
        }
        finally
        {
            semaphore.Release();
        }
        await BroadcastState(leagueId);
    }

    public async Task UndoLastContractAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
             using (var scope = _scopeFactory.CreateScope())
             {
                 var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                 
                 // Trova l'ultimo contratto creato in questa lega (assumendo sia quello errato)
                 // Ordina per ID decrescente è il modo più sicuro per "l'ultimo inserito"
                 var lastContract = await context.Contracts
                     .Include(c => c.Player)
                     .Where(c => c.Team.LeagueId == leagueId)
                     .OrderByDescending(c => c.Id)
                     .FirstOrDefaultAsync();

                 if (lastContract != null)
                 {
                     string playerName = lastContract.Player.LastName;
                     
                     context.Contracts.Remove(lastContract);
                     await context.SaveChangesAsync();
                     
                     // Opzionale: Notifica che è stato annullato?
                 }
             }

             var state = GetState(leagueId);
             await RefreshTeamSummariesInternal(leagueId, state);
             
             // Segnala ai client di ricaricare la lista Free Agents
             await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("RefreshList");
        }
        finally
        {
            semaphore.Release();
        }
        await BroadcastState(leagueId);
    }

    private async Task BroadcastState(int leagueId)
    {
        var state = GetState(leagueId);
        // Manda l'update SOLO al gruppo di questa lega
        await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("UpdateState", state);
    }
}