namespace FantasyBasket.API.Models.DTOs;

/// <summary>
/// Lightweight DTO for broadcasting bid updates during live auctions.
/// Contains only essential bid information without full roster data.
/// Reduces payload size from ~50KB to ~2KB per update.
/// </summary>
public class BidUpdateDto
{
    public double CurrentBidTotal { get; set; }
    public int CurrentBidYears { get; set; }
    public double CurrentBidYear1 { get; set; }
    public string HighBidderId { get; set; } = "";
    public string HighBidderName { get; set; } = "";
    public DateTime BidEndTime { get; set; }
    
    /// <summary>
    /// Only send budget updates for teams affected by this bid
    /// (current high bidder and previous high bidder if different)
    /// </summary>
    public List<TeamBudgetDto> UpdatedBudgets { get; set; } = new();
}

/// <summary>
/// Minimal DTO containing only budget information for a single team.
/// Used in bid updates to show budget changes without full roster data.
/// </summary>
public class TeamBudgetDto
{
    public string UserId { get; set; } = "";
    public string TeamName { get; set; } = "";
    public double RemainingBudget { get; set; }
    public int RosterCount { get; set; }
}
