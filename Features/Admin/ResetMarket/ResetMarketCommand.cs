using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.ResetMarket;

public record ResetMarketCommand(int LeagueId, string RequesterUserId) : IRequest<Result<string>>;
