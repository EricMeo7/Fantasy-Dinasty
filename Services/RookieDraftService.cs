using FantasyBasket.API.Data;
using FantasyBasket.API.Hubs;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.DTOs;
using FantasyBasket.API.Common;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace FantasyBasket.API.Services;

public class RookieDraftService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<DraftHub> _hubContext;
    private readonly ILogger<RookieDraftService> _logger;
    private readonly LiveDraftService _liveDraftService;
    private readonly IRookieSalaryScale _salaryScale;

    // LeagueId -> Timer
    private readonly ConcurrentDictionary<int, Timer> _draftTimers = new();
    
    // LeagueId -> Lock to ensure thread safety per league
    private readonly ConcurrentDictionary<int, SemaphoreSlim> _leagueLocks = new();

    // Cache volatile dello stato corrente per evitare query continue
    private readonly ConcurrentDictionary<int, CachedDraftState> _states = new();

    private const int SECONDS_PER_PICK = 120; // 2 Minutes

    public RookieDraftService(
        IServiceScopeFactory scopeFactory, 
        IHubContext<DraftHub> hubContext, 
        ILogger<RookieDraftService> logger, 
        LiveDraftService liveDraftService,
        IRookieSalaryScale salaryScale)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
        _liveDraftService = liveDraftService;
        _salaryScale = salaryScale;
    }

    private class CachedDraftState
    {
        public bool IsActive { get; set; }
        public bool IsPaused { get; set; }
        public DateTime? CurrentPickDeadline { get; set; }
    }

    private SemaphoreSlim GetLock(int leagueId) => _leagueLocks.GetOrAdd(leagueId, _ => new SemaphoreSlim(1, 1));

    public async Task<RookieDraftStateDto> GetStateAsync(int leagueId)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var currentSeasonStr = await context.Leagues
            .Where(l => l.Id == leagueId)
            .Select(l => l.CurrentSeason)
            .FirstOrDefaultAsync();

        if (currentSeasonStr == null) throw new HubException("League not found");

        int currentSeason = ParseSeasonYear(currentSeasonStr);

        var picks = await context.DraftPicks
            .Include(p => p.CurrentOwner)
            .Include(p => p.Player)
            .Where(p => p.LeagueId == leagueId && p.Season == currentSeason)
            .OrderBy(p => p.Round).ThenBy(p => p.SlotNumber)
            .AsNoTracking()
            .ToListAsync();

        var currentPick = picks.FirstOrDefault(p => p.PlayerId == null);
        var upcoming = picks.Where(p => p.PlayerId == null && p != currentPick).Take(5).ToList();
        var history = picks.Where(p => p.PlayerId != null).OrderByDescending(p => p.Round).ThenByDescending(p => p.SlotNumber).Take(3).ToList(); 

        _states.TryGetValue(leagueId, out var cached);
        var liveState = _liveDraftService.GetState(leagueId);

        return new RookieDraftStateDto
        {
            LeagueId = leagueId,
            IsActive = cached?.IsActive ?? false,
            IsPaused = cached?.IsPaused ?? false,
            CurrentPick = currentPick == null ? null : MapPick(currentPick, cached?.CurrentPickDeadline),
            UpcomingPicks = upcoming.Select(p => MapPick(p, null)).ToList(),
            RecentHistory = history.Select(p => MapPick(p, null)).ToList(),
            Teams = liveState.Teams,
            OnlineParticipants = liveState.OnlineParticipants
        };
    }

    public async Task<List<RookieDraftDto>> GetAvailableRookiesAsync(int leagueId)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var currentSeasonStr = await context.Leagues
            .Where(l => l.Id == leagueId)
            .Select(l => l.CurrentSeason)
            .FirstOrDefaultAsync();

        if (currentSeasonStr == null) throw new HubException("League not found");

        int currentSeason = ParseSeasonYear(currentSeasonStr);

        var rookies = await context.Players
            .Where(p => p.IsRookie && p.DraftYear == currentSeason)
            .Where(p => !context.DraftPicks
                .Where(dp => dp.LeagueId == leagueId && dp.PlayerId != null)
                .Select(dp => dp.PlayerId)
                .Contains(p.Id)) 
            .OrderBy(p => p.RealNbaDraftRank ?? 9999)
            .ThenBy(p => p.LastName)
            .Select(p => new RookieDraftDto
            {
                Id = p.Id,
                FullName = p.FirstName + " " + p.LastName,
                Position = p.Position,
                NbaTeam = p.NbaTeam,
                ExternalId = p.ExternalId,
                RealRank = p.RealNbaDraftRank
            })
            .AsNoTracking()
            .ToListAsync();

        return rookies;
    }

    public async Task StartDraftAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            var state = _states.GetOrAdd(leagueId, new CachedDraftState());
            state.IsActive = true;
            state.IsPaused = false;
            
            await StartTimerForCurrentPick(leagueId);
            await BroadcastState(leagueId);
        }
        finally { semaphore.Release(); }
    }

    public async Task SelectPlayerAsync(int leagueId, int playerId, string userId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var currentPick = await GetCurrentPickEntity(context, leagueId);
            if (currentPick == null) throw new HubException("ERR_DRAFT_COMPLETED");
            if (currentPick.CurrentOwner.UserId != userId) throw new HubException("ERR_NOT_YOUR_TURN");

            var player = await context.Players.FindAsync(playerId);
            if (player == null) throw new HubException("ERR_PLAYER_NOT_FOUND");
            if (!player.IsRookie) throw new HubException("ERR_PLAYER_NOT_ROOKIE");
            
            bool taken = await context.DraftPicks.AnyAsync(p => p.LeagueId == leagueId && p.PlayerId == playerId);
            if (taken) throw new HubException("ERR_PLAYER_ALREADY_TAKEN");

            double y1 = 0, y2 = 0, y3 = 0;
            using var transaction = await context.Database.BeginTransactionAsync();
            try
            {
                currentPick.PlayerId = playerId;
                var salaries = await GetSalariesForPickAsync(context, leagueId, currentPick.SlotNumber ?? 1);
                y1 = salaries.Y1;
                y2 = salaries.Y2;
                y3 = salaries.Y3;

                var contract = new Contract
                {
                    TeamId = currentPick.CurrentOwnerTeamId,
                    PlayerId = playerId,
                    ContractYears = 3,
                    SalaryYear1 = Math.Round(y1, 2),
                    SalaryYear2 = Math.Round(y2, 2),
                    SalaryYear3 = Math.Round(y3, 2),
                    IsRookieContract = true,
                    IsYear3TeamOption = true
                };
                context.Contracts.Add(contract);

                await context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch { await transaction.RollbackAsync(); throw; }

            StopTimer(leagueId);
            await StartTimerForCurrentPick(leagueId);

            var nextPick = await GetCurrentPickEntity(context, leagueId);
            var s = _states.TryGetValue(leagueId, out var cached) ? cached : null;
            
            var payload = new PlayerPickedDto
            {
                PickId = currentPick.Id,
                PlayerId = playerId,
                PlayerName = player.LastName,
                TeamId = currentPick.CurrentOwnerTeamId,
                SalaryY1 = Math.Round(y1, 2),
                SalaryY2 = Math.Round(y2, 2),
                SalaryY3 = Math.Round(y3, 2),
                NextPick = nextPick != null ? MapPick(nextPick, s?.CurrentPickDeadline) : null
            };

            await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("PlayerPicked", payload);
            await BroadcastBudgetsAsync(leagueId);
        }
        finally { semaphore.Release(); }
    }

    private async Task StartTimerForCurrentPick(int leagueId)
    {
        StopTimer(leagueId);
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var currentPick = await GetCurrentPickEntity(context, leagueId);
        if (currentPick == null) return;

        var deadline = DateTime.UtcNow.AddSeconds(SECONDS_PER_PICK);
        var state = _states.GetOrAdd(leagueId, new CachedDraftState());
        state.CurrentPickDeadline = deadline;

        var timer = new Timer(async _ => await AutoPickAsync(leagueId, currentPick.Id), null, SECONDS_PER_PICK * 1000, Timeout.Infinite);
        _draftTimers[leagueId] = timer;
    }

    private void StopTimer(int leagueId)
    {
        if (_draftTimers.TryRemove(leagueId, out var timer)) timer.Dispose();
    }

    private async Task AutoPickAsync(int leagueId, int pickId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var currentPick = await context.DraftPicks.FindAsync(pickId);
            if (currentPick == null || currentPick.PlayerId != null) return;

            var takenIds = await context.DraftPicks
                .Where(p => p.LeagueId == leagueId && p.PlayerId != null)
                .Select(p => p.PlayerId).ToListAsync();

            var bestRookie = await context.Players
                .Where(p => p.IsRookie && !takenIds.Contains(p.Id))
                .OrderBy(p => p.RealNbaDraftRank ?? 9999).ThenBy(p => p.LastName)
                .FirstOrDefaultAsync();

            if (bestRookie != null)
            {
                 double y1 = 0, y2 = 0, y3 = 0;
                 using var transaction = await context.Database.BeginTransactionAsync();
                 try 
                 {
                     currentPick.PlayerId = bestRookie.Id;
                     var salaries = await GetSalariesForPickAsync(context, leagueId, currentPick.SlotNumber ?? 1);
                     y1 = salaries.Y1;
                     y2 = salaries.Y2;
                     y3 = salaries.Y3;

                     var contract = new Contract
                     {
                         TeamId = currentPick.CurrentOwnerTeamId,
                         PlayerId = bestRookie.Id,
                         ContractYears = 3,
                         SalaryYear1 = Math.Round(y1, 2),
                         SalaryYear2 = Math.Round(y2, 2),
                         SalaryYear3 = Math.Round(y3, 2),
                         IsRookieContract = true,
                         IsYear3TeamOption = true
                     };
                     context.Contracts.Add(contract);
                     await context.SaveChangesAsync();
                     await transaction.CommitAsync();
                 }
                 catch { await transaction.RollbackAsync(); throw; }
                 
                 StopTimer(leagueId);
                 await StartTimerForCurrentPick(leagueId);
                 
                 var nextPick = await GetCurrentPickEntity(context, leagueId);
                 var s = _states.TryGetValue(leagueId, out var cached) ? cached : null;

                 var payload = new PlayerPickedDto
                 {
                     PickId = currentPick.Id,
                     PlayerId = bestRookie.Id,
                     PlayerName = bestRookie.LastName + " (Auto)",
                     TeamId = currentPick.CurrentOwnerTeamId,
                     SalaryY1 = Math.Round(y1, 2),
                     SalaryY2 = Math.Round(y2, 2),
                     SalaryY3 = Math.Round(y3, 2),
                     NextPick = nextPick != null ? MapPick(nextPick, s?.CurrentPickDeadline) : null
                 };
                 await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("PlayerPicked", payload);
                 await BroadcastBudgetsAsync(leagueId);
            }
            else { StopTimer(leagueId); }
        }
        catch (Exception ex) { _logger.LogError(ex, "Error during AutoPick"); }
        finally { semaphore.Release(); }
    }

    private async Task<DraftPick?> GetCurrentPickEntity(ApplicationDbContext context, int leagueId)
    {
         var currentSeason = await context.Leagues.Where(l => l.Id == leagueId).Select(l => l.CurrentSeason).FirstOrDefaultAsync();
         int season = ParseSeasonYear(currentSeason);
         return await context.DraftPicks
            .Include(p => p.CurrentOwner)
            .Where(p => p.LeagueId == leagueId && p.Season == season && p.PlayerId == null)
            .OrderBy(p => p.Round).ThenBy(p => p.SlotNumber)
            .FirstOrDefaultAsync();
    }

    private async Task<(double Y1, double Y2, double Y3)> GetSalariesForPickAsync(ApplicationDbContext context, int leagueId, int pickNum)
    {
        var wageScale = await context.RookieWageScales
            .FirstOrDefaultAsync(w => w.LeagueId == leagueId && w.PickNumber == pickNum);

        if (wageScale != null)
        {
            double y1 = wageScale.Year1Salary;
            double y2 = wageScale.Year2Salary;
            double y3 = Math.Round(y2 * (1 + (wageScale.Year3OptionPercentage / 100.0)), 2);
            return (y1, y2, y3);
        }
        else
        {
            var leagueSettings = await context.LeagueSettings
                .Where(s => s.LeagueId == leagueId)
                .Select(s => new { s.NumberOfTeams })
                .FirstOrDefaultAsync();

            int maxPicks = (leagueSettings?.NumberOfTeams ?? 12) * 2;
            
            // Fallback SlotNumber rank if it's missing (to avoid same salary for everyone)
            if (pickNum <= 1)
            {
                var pickCount = await context.DraftPicks
                    .CountAsync(dp => dp.LeagueId == leagueId && dp.PlayerId != null);
                pickNum = Math.Max(1, pickCount + 1);
            }

            double y1 = _salaryScale.GetSalaryForSlot(pickNum, maxPicks);
            return (y1, y1, y1);
        }
    }
    
    private static int ParseSeasonYear(string? season)
    {
        return SeasonHelper.ParseStartYear(season);
    }

    public async Task PauseDraftAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            var state = _states.GetOrAdd(leagueId, new CachedDraftState());
            state.IsActive = false;
            state.IsPaused = true;
            StopTimer(leagueId);
            await BroadcastState(leagueId);
        }
        finally { semaphore.Release(); }
    }

    public async Task UndoLastPickAsync(int leagueId)
    {
        var semaphore = GetLock(leagueId);
        await semaphore.WaitAsync();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

             var league = await context.Leagues.FindAsync(leagueId);
             if (league == null) return;
             int season = ParseSeasonYear(league.CurrentSeason);

             var lastPickWithPlayer = await context.DraftPicks
                .Where(p => p.LeagueId == leagueId && p.Season == season && p.PlayerId != null)
                .OrderByDescending(p => p.Round).ThenByDescending(p => p.SlotNumber)
                .FirstOrDefaultAsync();

            if (lastPickWithPlayer != null)
            {
                int? playerId = lastPickWithPlayer.PlayerId;
                lastPickWithPlayer.PlayerId = null;
                var contract = await context.Contracts
                    .FirstOrDefaultAsync(c => c.TeamId == lastPickWithPlayer.CurrentOwnerTeamId && c.PlayerId == playerId);
                if (contract != null) context.Contracts.Remove(contract);
                await context.SaveChangesAsync();
                await StartTimerForCurrentPick(leagueId);
            }
            await BroadcastState(leagueId);
        }
        finally { semaphore.Release(); }
    }

    public async Task BroadcastState(int leagueId)
    {
        await _liveDraftService.RefreshStateAsync(leagueId);
        var state = await GetStateAsync(leagueId);
        await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("UpdateRookieDraftState", state);
    }

    public async Task BroadcastBudgetsAsync(int leagueId)
    {
        await _liveDraftService.RefreshStateAsync(leagueId);
        var liveState = _liveDraftService.GetState(leagueId);
        
        var update = new DraftSidebarUpdateDto
        {
            Deltas = liveState.Teams.Select(t => new TeamBudgetDeltaDto
            {
                U = t.UserId,
                B = t.RemainingBudget,
                R = t.RosterCount
            }).ToList()
        };

        await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("UpdateRookieBudgets", update);
    }

    private static CurrentPickDto MapPick(DraftPick pick, DateTime? deadline)
    {
        return new CurrentPickDto
        {
            Id = pick.Id,
            Round = pick.Round,
            PickNumber = pick.SlotNumber ?? 0,
            TeamId = pick.CurrentOwnerTeamId,
            TeamName = pick.CurrentOwner?.Name ?? "Unknown",
            Deadline = deadline
        };
    }
}
