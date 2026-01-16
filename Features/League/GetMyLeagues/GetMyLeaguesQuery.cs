using MediatR;

namespace FantasyBasket.API.Features.League.GetMyLeagues;

public record GetMyLeaguesQuery(string UserId) : IRequest<List<LeagueListDto>>;
