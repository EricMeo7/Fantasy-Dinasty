using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.UpdateScores;

public record UpdateScoresCommand(int LeagueId, string RequesterUserId) : IRequest<Result<string>>;
