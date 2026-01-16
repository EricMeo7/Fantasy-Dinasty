using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Roster.GetMyRoster;

public class GetMyRosterQuery : IRequest<Result<List<RosterPlayerDto>>>
{
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public GetMyRosterQuery(int leagueId, string userId)
    {
        LeagueId = leagueId;
        UserId = userId;
    }
}
