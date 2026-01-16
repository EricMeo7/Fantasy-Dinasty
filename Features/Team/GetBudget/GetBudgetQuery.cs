using FantasyBasket.API.Common;
using FantasyBasket.API.Models.Dto;
using MediatR;

namespace FantasyBasket.API.Features.Team.GetBudget;

public class GetBudgetQuery : IRequest<Result<TeamFinanceOverviewDto>>
{
    public int LeagueId { get; set; }
    public string UserId { get; set; }

    public GetBudgetQuery(int leagueId, string userId)
    {
        LeagueId = leagueId;
        UserId = userId;
    }
}
