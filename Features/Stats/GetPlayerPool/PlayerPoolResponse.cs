namespace FantasyBasket.API.Features.Stats.GetPlayerPool;

public class PlayerPoolResponse
{
    public List<PlayerPoolDto> Players { get; set; } = new();
    public int TotalCount { get; set; }
}
