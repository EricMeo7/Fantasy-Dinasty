using MediatR;
using FantasyBasket.API.DTOs;
using FantasyBasket.API.Features.Draft.RunLottery;

namespace FantasyBasket.API.Features.Draft.RevealLotteryPick;

public class RevealLotteryPickCommand : IRequest<LotteryResultDto?>
{
    public int LeagueId { get; set; }
    public int Season { get; set; }

    public RevealLotteryPickCommand(int leagueId, int season)
    {
        LeagueId = leagueId;
        Season = season;
    }
}
