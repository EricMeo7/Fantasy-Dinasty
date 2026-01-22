using FantasyBasket.API.Data;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Draft.RunLottery;

public class RunLotteryHandler : IRequestHandler<RunLotteryCommand, List<LotteryResultDto>>
{
    private readonly ILotteryService _lotteryService;
    private readonly ApplicationDbContext _context;

    public RunLotteryHandler(ILotteryService lotteryService, ApplicationDbContext context)
    {
        _lotteryService = lotteryService;
        _context = context;
    }

    public async Task<List<LotteryResultDto>> Handle(RunLotteryCommand request, CancellationToken cancellationToken)
    {
        // Run the lottery
        var assignedPicks = await _lotteryService.RunLotteryAsync(request.LeagueId, request.Season);

        // Reload picks with team data for response
        var result = await _context.DraftPicks
            .AsNoTracking()
            .Where(p => assignedPicks.Select(ap => ap.Id).Contains(p.Id))
            .Include(p => p.OriginalOwner)
            .Include(p => p.CurrentOwner)
            .OrderBy(p => p.SlotNumber)
            .Select(p => new LotteryResultDto
            {
                PickId = p.Id,
                SlotNumber = p.SlotNumber ?? 0,
                OriginalOwnerTeamName = p.OriginalOwner.Name,
                CurrentOwnerTeamName = p.CurrentOwner.Name,
                Round = p.Round
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}
