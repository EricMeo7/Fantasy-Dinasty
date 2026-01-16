using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Team.ReleasePlayer;

public class ReleasePlayerCommand : IRequest<Result<string>>
{
    public int PlayerId { get; set; }
    public int LeagueId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public ReleasePlayerCommand(int playerId, int leagueId, string userId)
    {
        PlayerId = playerId;
        LeagueId = leagueId;
        UserId = userId;
    }
}
