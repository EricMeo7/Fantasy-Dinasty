using Microsoft.AspNetCore.SignalR;
using FantasyBasket.API.Services;
using FantasyBasket.API.Data;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Hubs;

public class DraftHub : Hub
{
    private readonly LiveDraftService _draftService;
    private readonly RookieDraftService _rookieDraftService;
    private readonly ApplicationDbContext _context;

    public DraftHub(LiveDraftService draftService, RookieDraftService rookieDraftService, ApplicationDbContext context)
    {
        _draftService = draftService;
        _rookieDraftService = rookieDraftService;
        _context = context;
    }

    // Helper per recuperare l'ID lega salvato nella connessione
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

        // 1. Leggi LeagueId dalla Query String (inviata dal frontend)
        var httpContext = Context.GetHttpContext();
        var leagueIdStr = httpContext?.Request.Query["leagueId"];
        var userId = Context.UserIdentifier;

        if (int.TryParse(leagueIdStr, out int leagueId))
        {
            // 2. Salva nel contesto della connessione SignalR
            Context.Items["LeagueId"] = leagueId;

            // 3. Aggiungi al gruppo
            await Groups.AddToGroupAsync(Context.ConnectionId, $"League_{leagueId}");

            var state = _draftService.GetState(leagueId);
            Console.WriteLine($"[SignalR-Outbound] Initial State for Connection {Context.ConnectionId}. {SignalRLoggingHelper.GetPayloadInfo(state)}");
            await Clients.Caller.SendAsync("UpdateState", state);

            // 4. Notifica connessione al Service (Presence)
            if (userId != null)
            {
                await _draftService.UserConnectedAsync(leagueId, userId);
                // Also broadcast for Rookie Draft so the lobby updates
                await _rookieDraftService.BroadcastState(leagueId);
            }
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var leagueId = GetConnectionLeagueId();
        var userId = Context.UserIdentifier;

        if (leagueId != 0 && userId != null)
        {
            await _draftService.UserDisconnectedAsync(leagueId, userId);
            // Also broadcast for Rookie Draft
            await _rookieDraftService.BroadcastState(leagueId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task Nominate(int playerId, string playerName, double amount, int years)
    {
        int leagueId = GetConnectionLeagueId();
        if (leagueId == 0) return;

        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        var teamName = await _context.Teams
            .Where(t => t.UserId == userId && t.LeagueId == leagueId)
            .Select(t => t.Name)
            .FirstOrDefaultAsync() ?? "Unknown Team";

        try
        {
            await _draftService.NominatePlayerAsync(leagueId, playerId, playerName, amount, years, userId, teamName);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task Bid(double totalAmount, int years)
    {
        int leagueId = GetConnectionLeagueId();
        if (leagueId == 0) return;

        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        var teamName = await _context.Teams
            .Where(t => t.UserId == userId && t.LeagueId == leagueId)
            .Select(t => t.Name)
            .FirstOrDefaultAsync() ?? "Unknown Team";

        try
        {
            await _draftService.PlaceBidAsync(leagueId, totalAmount, years, userId, teamName);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task StartDraft(int leagueId)
    {
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        // Controllo Admin
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);

        if (team == null || !team.IsAdmin)
        {
            await Clients.Caller.SendAsync("Error", "Permesso negato: Solo il Commissioner può avviare il draft.");
            return;
        }

        // Recupera partecipanti previsti (Teams della lega)
        var leagueUserIds = await _context.Teams
            .Where(t => t.LeagueId == leagueId)
            .Select(t => t.UserId)
            .ToListAsync();

        if (!leagueUserIds.Any())
        {
            await Clients.Caller.SendAsync("Error", "Nessuna squadra trovata.");
            return;
        }

        // --- CHECK ONLINE PRESENCE ---
        // Verifica che TUTTI i manager siano connessi
        var currentState = _draftService.GetState(leagueId);
        var onlineUsers = currentState.OnlineParticipants; 

        var offlineUsers = leagueUserIds.Except(onlineUsers).ToList();
        
        if (offlineUsers.Any())
        {
             // "Aspettare che tutti gli utenti siano collegati prima di far partire l'asta draft."
             await Clients.Caller.SendAsync("Error", $"Impossibile avviare: {offlineUsers.Count} manager sono offline. Attendere tutti i partecipanti.");
             return;
        }

        await _draftService.StartDraftAsync(leagueId, leagueUserIds);
    }
    public async Task PauseDraft(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _draftService.PauseDraftAsync(leagueId);
    }

    public async Task RemoveLastPick(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _draftService.UndoLastContractAsync(leagueId);
    }

    public async Task ResetCurrentRound(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _draftService.ResetCurrentAuctionAsync(leagueId);
    }

    private async Task<bool> IsAdmin()
    {
        var userId = Context.UserIdentifier;
        if (userId == null) return false;
        
        int leagueId = GetConnectionLeagueId();
        if (leagueId == 0) return false;

        return await _context.Teams
            .Where(t => t.UserId == userId && t.LeagueId == leagueId)
            .Select(t => t.IsAdmin)
            .FirstOrDefaultAsync();
    }
    // --- ROOKIE DRAFT METHODS ---

    public async Task StartRookieDraft(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _rookieDraftService.StartDraftAsync(leagueId);
    }

    public async Task GetRookieDraftState(int leagueId)
    {
        // Simple getter, useful for re-sync
        var state = await _rookieDraftService.GetStateAsync(leagueId);
        await Clients.Caller.SendAsync("UpdateRookieDraftState", state);
    }

    public async Task SelectRookie(int playerId)
    {
        int leagueId = GetConnectionLeagueId();
        if (leagueId == 0) return;

        var userId = Context.UserIdentifier;
        if (userId == null) return;

        try 
        {
            await _rookieDraftService.SelectPlayerAsync(leagueId, playerId, userId);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task GetAvailableRookies(int leagueId)
    {
        var rookies = await _rookieDraftService.GetAvailableRookiesAsync(leagueId);
        await Clients.Caller.SendAsync("UpdateAvailableRookies", rookies);
    }

    public async Task PauseRookieDraft(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _rookieDraftService.PauseDraftAsync(leagueId);
    }

    public async Task UndoRookiePick(int leagueId)
    {
        if (!await IsAdmin()) return;
        await _rookieDraftService.UndoLastPickAsync(leagueId);
    }
}