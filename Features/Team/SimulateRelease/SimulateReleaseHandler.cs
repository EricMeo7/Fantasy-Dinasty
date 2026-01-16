using FantasyBasket.API.Common;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using MediatR;

namespace FantasyBasket.API.Features.Team.SimulateRelease;

public class SimulateReleaseHandler : IRequestHandler<SimulateReleaseQuery, Result<List<DeadCapDetailDto>>>
{
    private readonly AuctionService _auctionService;

    public SimulateReleaseHandler(AuctionService auctionService)
    {
        _auctionService = auctionService;
    }

    public async Task<Result<List<DeadCapDetailDto>>> Handle(SimulateReleaseQuery request, CancellationToken cancellationToken)
    {
        var result = await _auctionService.SimulateDropPenaltyAsync(request.PlayerId, request.UserId, request.LeagueId);
        return Result<List<DeadCapDetailDto>>.Success(result);
    }
}
