using Microsoft.AspNetCore.SignalR;

namespace FantasyBasket.API.Hubs;

public class MatchupHub : Hub
{
    // Permette ai client di unirsi al gruppo della loro lega
    public async Task JoinLeagueGroup(string leagueId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"League_{leagueId}");
    }

    public async Task LeaveLeagueGroup(string leagueId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"League_{leagueId}");
    }
}
