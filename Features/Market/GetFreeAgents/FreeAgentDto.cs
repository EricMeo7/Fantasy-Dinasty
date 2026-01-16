namespace FantasyBasket.API.Features.Market.GetFreeAgents;

public class FreeAgentDto
{
    public int Id { get; set; }
    public int? ExternalId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public double AvgPoints { get; set; }
    public double AvgFantasyPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }
    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
    
    // Auction Info
    public bool HasActiveAuction { get; set; }
    public DateTime? AuctionEndTime { get; set; }
    public double CurrentOffer { get; set; }
    public int CurrentYears { get; set; }
    public string HighBidderName { get; set; } = string.Empty;
    public double MinBid { get; set; }
}
