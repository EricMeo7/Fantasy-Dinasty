using MediatR;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Features.League.CreateLeague;

public record CreateLeagueCommand(string LeagueName, string MyTeamName, string UserId) : IRequest<Result<CreateLeagueResponse>>;

public class CreateLeagueResponse
{
    public int LeagueId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
