using System.Collections.Concurrent;
using FantasyBasket.API.Data;
using FantasyBasket.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Services;

public class LotteryState
{
    public int LeagueId { get; set; }
    public bool IsActive { get; set; } = false;
    public List<string> OnlineParticipants { get; set; } = new();
    public List<LotteryTeamDto> Teams { get; set; } = new();
}

public class LotteryTeamDto
{
    public string UserId { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public int TeamId { get; set; }
}

public class LiveLotteryService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<LotteryHub> _hubContext;

    // LeagueId -> State
    private readonly ConcurrentDictionary<int, LotteryState> _leagueStates = new();
    
    // LeagueId -> Concurrent Set of UserIds
    private readonly ConcurrentDictionary<int, HashSet<string>> _onlineUsers = new();

    public LiveLotteryService(IServiceScopeFactory scopeFactory, IHubContext<LotteryHub> hubContext)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
    }

    public LotteryState GetState(int leagueId)
    {
        var state = _leagueStates.GetOrAdd(leagueId, new LotteryState { LeagueId = leagueId });

        // Sync online users
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

    public async Task EnsureInitializedAsync(int leagueId)
    {
        var state = GetState(leagueId);
        if (state.Teams.Count == 0)
        {
            await RefreshTeamsInternal(leagueId, state);
            await BroadcastState(leagueId);
        }
    }

    public async Task UserConnectedAsync(int leagueId, string userId)
    {
        var onlineSet = _onlineUsers.GetOrAdd(leagueId, _ => new HashSet<string>());
        lock (onlineSet)
        {
            onlineSet.Add(userId);
        }

        // Ensure teams list is populated
        var state = GetState(leagueId);
        if (state.Teams.Count == 0)
        {
            await RefreshTeamsInternal(leagueId, state);
        }

        await BroadcastState(leagueId);
    }

    public async Task UserDisconnectedAsync(int leagueId, string userId)
    {
        if (_onlineUsers.TryGetValue(leagueId, out var onlineSet))
        {
            lock (onlineSet)
            {
                onlineSet.Remove(userId);
            }
            await BroadcastState(leagueId);
        }
    }

    public async Task StartLotteryAsync(int leagueId)
    {
        var state = GetState(leagueId);
        state.IsActive = true;
        await BroadcastState(leagueId);
    }
    
    public async Task StopLotteryAsync(int leagueId)
    {
        var state = GetState(leagueId);
        state.IsActive = false;
        await BroadcastState(leagueId);
    }

    private async Task RefreshTeamsInternal(int leagueId, LotteryState state)
    {
        using (var scope = _scopeFactory.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var teams = await context.Teams
                .Where(t => t.LeagueId == leagueId)
                .Select(t => new LotteryTeamDto 
                { 
                    UserId = t.UserId, 
                    TeamName = t.Name,
                    TeamId = t.Id
                })
                .ToListAsync();

            state.Teams = teams; // Simple replacement, thread-safety is handled by eventual consistency or we could lock
        }
    }

    private async Task BroadcastState(int leagueId)
    {
        var state = GetState(leagueId);
        // The Hub expects "LotteryStateUpdated" method on client, based on ILotteryClient interface
        await _hubContext.Clients.Group($"Lottery-{leagueId}").SendAsync("LotteryStateUpdated", state);
    }
}
