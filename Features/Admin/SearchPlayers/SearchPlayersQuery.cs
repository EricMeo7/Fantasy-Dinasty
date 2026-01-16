using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.SearchPlayers;

public record SearchPlayersQuery(int LeagueId, string RequesterUserId, string Query) : IRequest<Result<List<AdminPlayerSearchDto>>>;
