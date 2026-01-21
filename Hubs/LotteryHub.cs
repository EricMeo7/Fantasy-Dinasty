using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using FantasyBasket.API.Services;
using FantasyBasket.API.Data;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Hubs;

public interface ILotteryClient
{
    Task LotteryStateUpdated(object state);
    Task PickRevealed(object pick);
}

public class LotteryHub : Hub<ILotteryClient>
{
    private readonly LiveLotteryService _lotteryService;
    private readonly ApplicationDbContext _context;

    public LotteryHub(LiveLotteryService lotteryService, ApplicationDbContext context)
    {
        _lotteryService = lotteryService;
        _context = context;
    }

    private int GetConnectionLeagueId()
    {
        if (Context.Items.TryGetValue("LeagueId", out var leagueIdObj) && leagueIdObj is int leagueId)
        {
            return leagueId;
        }
        return 0;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();

        var httpContext = Context.GetHttpContext();
        var leagueIdStr = httpContext?.Request.Query["leagueId"];
        var userId = Context.UserIdentifier;

        if (int.TryParse(leagueIdStr, out int leagueId))
        {
            Context.Items["LeagueId"] = leagueId;
            Console.WriteLine($"[LotteryHub] Connected: ConnectionId={Context.ConnectionId}, LeagueId={leagueId}, UserId={userId ?? "NULL"}");
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Lottery-{leagueId}");

            // Ensure state is initialized (load teams) even if user is not fully authenticated yet or just probing
            await _lotteryService.EnsureInitializedAsync(leagueId);

            if (userId != null)
            {
                await _lotteryService.UserConnectedAsync(leagueId, userId);
            }
            else
            {
                // Send current state to caller even if not authenticated/tracked
                var state = _lotteryService.GetState(leagueId);
                await Clients.Caller.LotteryStateUpdated(state);
            }
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var leagueId = GetConnectionLeagueId();
        var userId = Context.UserIdentifier;

        if (leagueId != 0 && userId != null)
        {
            await _lotteryService.UserDisconnectedAsync(leagueId, userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task StartLottery(int leagueId)
    {
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        // Check Admin
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);

        if (team == null || !team.IsAdmin)
        {
            // Optionally send error to caller
            return;
        }

        await _lotteryService.StartLotteryAsync(leagueId);
    }
}
