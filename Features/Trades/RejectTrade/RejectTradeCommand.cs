using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Trades.RejectTrade;

public class RejectTradeCommand : IRequest<Result<string>>
{
    public int TradeId { get; set; }
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public RejectTradeCommand(int tradeId, int leagueId, string userId)
    {
        TradeId = tradeId;
        LeagueId = leagueId;
        UserId = userId;
    }
}
