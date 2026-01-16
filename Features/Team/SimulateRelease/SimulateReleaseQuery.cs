using FantasyBasket.API.Common;
using FantasyBasket.API.Models.Dto;
using MediatR;

namespace FantasyBasket.API.Features.Team.SimulateRelease;

public class SimulateReleaseQuery : IRequest<Result<List<DeadCapDetailDto>>>
{
    public int PlayerId { get; set; }
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public SimulateReleaseQuery(int playerId, int leagueId, string userId)
    {
        PlayerId = playerId;
        LeagueId = leagueId;
        UserId = userId;
    }
}
