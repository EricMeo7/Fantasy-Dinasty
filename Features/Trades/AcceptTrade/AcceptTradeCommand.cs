using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Trades.AcceptTrade;

public class AcceptTradeCommand : IRequest<Result<string>>
{
    public int TradeId { get; set; }
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public AcceptTradeCommand(int tradeId, int leagueId, string userId)
    {
        TradeId = tradeId;
        LeagueId = leagueId;
        UserId = userId;
    }
}
