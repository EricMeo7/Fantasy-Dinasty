using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Market.GetPlayerDetails;

public class GetPlayerDetailsQuery : IRequest<Result<object>>
{
    public int PlayerId { get; set; }
    public int? LeagueId { get; set; }

    public GetPlayerDetailsQuery(int playerId, int? leagueId = null)
    {
        PlayerId = playerId;
        LeagueId = leagueId;
    }
}
