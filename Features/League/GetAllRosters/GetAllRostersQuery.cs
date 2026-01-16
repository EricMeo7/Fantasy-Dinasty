using MediatR;

namespace FantasyBasket.API.Features.League.GetAllRosters;

public record GetAllRostersQuery(int LeagueId) : IRequest<List<TeamRosterDto>>;
