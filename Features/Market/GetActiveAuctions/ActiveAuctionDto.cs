namespace FantasyBasket.API.Features.Market.GetActiveAuctions;

public class ActiveAuctionDto
{
    public int PlayerId { get; set; }
    public double CurrentOffer { get; set; }
    public int CurrentYears { get; set; }
    public string HighBidderName { get; set; } = string.Empty;
    public DateTime EndTime { get; set; }
}
