using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Lineup.UpdateLineup;

public class UpdateLineupCommand : IRequest<Result<bool>>
{
    public DateTime Date { get; set; }
    public Dictionary<string, int> StarterSlots { get; set; } = new();
    public List<int> Bench { get; set; } = new();
    
    // Internal user context
    public string UserId { get; set; } = string.Empty;
    public int LeagueId { get; set; }
}
