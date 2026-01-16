namespace FantasyBasket.API.Models.Dto;

public class BidRequestDto
{
    public int PlayerId { get; set; }
    public double TotalAmount { get; set; } // Es. 75
    public int Years { get; set; } // Es. 3
}