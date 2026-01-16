using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Trades.ProposeTrade;

public class ProposeTradeCommand : IRequest<Result<int>>
{
    public int LeagueId { get; set; }
    public string ProposerId { get; set; } = string.Empty;
    public List<TradeOfferCommand> Offers { get; set; } = new();
}

public class TradeOfferCommand
{
    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public int PlayerId { get; set; }
}
