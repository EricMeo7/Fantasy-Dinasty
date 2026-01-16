using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Market.PlaceBid;

public class PlaceBidResult
{
    public string Message { get; set; } = string.Empty;
    public DateTime EndTime { get; set; }
    public double Year1Cost { get; set; }
}

public class PlaceBidCommand : IRequest<Result<PlaceBidResult>>
{
    public int PlayerId { get; set; }
    public double TotalAmount { get; set; }
    public int Years { get; set; }
    
    // Injected from Controller Context
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;
}
