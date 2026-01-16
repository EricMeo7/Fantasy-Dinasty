using FantasyBasket.API.Models;

namespace FantasyBasket.API.Features.Trades.GetMyTrades;

public class TradeDto
{
    public int Id { get; set; }
    public string ProposerId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<TradeOfferDto> Offers { get; set; } = new();
    public List<string> AcceptedUserIds { get; set; } = new();
    
    // UI Helpers
    public bool IsMeProposer { get; set; }
    public bool DidIAccept { get; set; }
    public bool CanIAccept { get; set; }
}

public class TradeOfferDto
{
    public string FromUserId { get; set; } = string.Empty;
    public string FromTeamName { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string ToTeamName { get; set; } = string.Empty;
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string PlayerPosition { get; set; } = string.Empty;
    public int? PlayerExternalId { get; set; }
}
