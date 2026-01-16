namespace FantasyBasket.API.Models.Dto;

public class TradeProposalDto
{
    public List<TradeOfferDto> Offers { get; set; } = new();
}

public class TradeOfferDto
{
    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public int PlayerId { get; set; }
}