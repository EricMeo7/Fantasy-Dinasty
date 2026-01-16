using MediatR;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Features.League.GetMatchDetails;

public record GetMatchDetailsQuery(int MatchId, int LeagueId) : IRequest<Result<MatchDetailsResponseDto>>;

public record GetCurrentMatchupQuery(string UserId, int LeagueId) : IRequest<Result<MatchDetailsResponseDto>>;
