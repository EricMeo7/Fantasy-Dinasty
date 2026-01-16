using FantasyBasket.API.Common;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using MediatR;

namespace FantasyBasket.API.Features.Team.GetBudget;

public class GetBudgetHandler : IRequestHandler<GetBudgetQuery, Result<TeamFinanceOverviewDto>>
{
    private readonly AuctionService _auctionService;

    public GetBudgetHandler(AuctionService auctionService)
    {
        _auctionService = auctionService;
    }

    public async Task<Result<TeamFinanceOverviewDto>> Handle(GetBudgetQuery request, CancellationToken cancellationToken)
    {
        var result = await _auctionService.GetTeamFinanceOverview(request.UserId, request.LeagueId);
        return Result<TeamFinanceOverviewDto>.Success(result);
    }
}
