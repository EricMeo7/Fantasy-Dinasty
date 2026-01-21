using MediatR;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Features.Draft.GetLotteryProbabilities;

public record GetLotteryProbabilitiesQuery(int LeagueId, int Season) : IRequest<Result<List<LotteryProbabilityDto>>>;

public class LotteryProbabilityDto
{
    public string TeamName { get; set; } = string.Empty;
    public double WinPct { get; set; }
    public double Probability { get; set; }
    public int ProjectedRank { get; set; }
}
