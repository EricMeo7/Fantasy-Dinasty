using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.League.GetLeagueDetails;

public class GetLeagueDetailsQuery : IRequest<Result<LeagueDetailsDto>>
{
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public GetLeagueDetailsQuery(int leagueId, string userId)
    {
        LeagueId = leagueId;
        UserId = userId;
    }
}
