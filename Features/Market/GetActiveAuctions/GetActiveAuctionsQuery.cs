using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Market.GetActiveAuctions;

public record GetActiveAuctionsQuery(int LeagueId) : IRequest<Result<List<ActiveAuctionDto>>>;
