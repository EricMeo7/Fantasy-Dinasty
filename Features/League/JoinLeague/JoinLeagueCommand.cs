using MediatR;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Features.League.JoinLeague;

public record JoinLeagueCommand(string Code, string MyTeamName, string UserId) : IRequest<Result<JoinLeagueResponse>>;

public class JoinLeagueResponse
{
    public int LeagueId { get; set; }
    public string Message { get; set; } = string.Empty;
}
