using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.League.GetMatchups;

public class GetMatchupsQuery : IRequest<Result<List<MatchupDto>>>
{
    public int LeagueId { get; set; }
    
    public GetMatchupsQuery(int leagueId)
    {
        LeagueId = leagueId;
    }
}
