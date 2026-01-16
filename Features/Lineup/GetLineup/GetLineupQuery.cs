using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Lineup.GetLineup;

public class GetLineupQuery : IRequest<Result<List<DailyLineupDto>>>
{
    public DateTime Date { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int LeagueId { get; set; }
    public int? TargetTeamId { get; set; }

    public GetLineupQuery(DateTime date, string userId, int leagueId, int? targetTeamId = null)
    {
        Date = date;
        UserId = userId;
        LeagueId = leagueId;
        TargetTeamId = targetTeamId;
    }
}
