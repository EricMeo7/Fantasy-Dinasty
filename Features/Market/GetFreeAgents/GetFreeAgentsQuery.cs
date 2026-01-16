using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Market.GetFreeAgents;

public class GetFreeAgentsQuery : IRequest<Result<List<FreeAgentDto>>>
{
    public int LeagueId { get; set; }
    // Optional filters could be added here later (Position, Name, etc.)

    public GetFreeAgentsQuery(int leagueId)
    {
        LeagueId = leagueId;
    }
}
