using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Trades.GetMyTrades;

public class GetMyTradesQuery : IRequest<Result<List<TradeDto>>>
{
    public int LeagueId { get; set; }
    public string UserId { get; set; }

    public GetMyTradesQuery(int leagueId, string userId)
    {
        LeagueId = leagueId;
        UserId = userId;
    }
}
