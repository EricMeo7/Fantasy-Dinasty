using MediatR;

namespace FantasyBasket.API.Features.Draft.RunLottery;

public record RunLotteryCommand(int LeagueId, int Season) : IRequest<List<LotteryResultDto>>;
