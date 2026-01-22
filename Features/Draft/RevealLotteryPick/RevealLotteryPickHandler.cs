using FantasyBasket.API.Data;
using FantasyBasket.API.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Features.Draft.RunLottery;
using FantasyBasket.API.Common;
using Microsoft.Extensions.Logging;

namespace FantasyBasket.API.Features.Draft.RevealLotteryPick;

public class RevealLotteryPickHandler : IRequestHandler<RevealLotteryPickCommand, LotteryResultDto?>
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<LotteryHub, ILotteryClient> _hubContext;
    private readonly ILogger<RevealLotteryPickHandler> _logger;

    public RevealLotteryPickHandler(ApplicationDbContext context, IHubContext<LotteryHub, ILotteryClient> hubContext, ILogger<RevealLotteryPickHandler> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<LotteryResultDto?> Handle(RevealLotteryPickCommand request, CancellationToken cancellationToken)
    {
        // DEBUG: Logging
        Console.WriteLine($"[RevealHandler] Request for League {request.LeagueId}, Season {request.Season}");

        var countTotal = await _context.DraftPicks.CountAsync(p => p.LeagueId == request.LeagueId && p.Season == request.Season);
        var countUnrevealed = await _context.DraftPicks.CountAsync(p => p.LeagueId == request.LeagueId && p.Season == request.Season && !p.IsRevealed);
        
        Console.WriteLine($"[RevealHandler] Total Picks: {countTotal}, Unrevealed: {countUnrevealed}");

        // Find the "highest slot" unrevealed pick (e.g., reveal 4, then 3, then 2, then 1)
        // We want to reveal in reverse order of importance (usually 14 down to 1, but we only hid 1-4)
        // So we reveal 4 first, then 3, then 2, then 1.
        
        var nextPickToReveal = await _context.DraftPicks
            .Where(p => p.LeagueId == request.LeagueId && 
                        p.Season == request.Season && 
                        !p.IsRevealed && 
                        p.SlotNumber.HasValue &&
                        p.SlotNumber <= 4) // Only manually reveal Top 4
            .OrderBy(p => p.SlotNumber) // Reveal 1 -> 2 -> 3 -> 4
            .Include(p => p.OriginalOwner)
            .Include(p => p.CurrentOwner)
            .FirstOrDefaultAsync(cancellationToken);

        if (nextPickToReveal == null)
        {
             Console.WriteLine("[RevealHandler] No next pick found!");
             return null; // Nothing left to reveal
        }

        // Reveal it
        nextPickToReveal.IsRevealed = true;

        // If we just revealed the #4 pick, reveal ALL remaining picks in the board (5-N)
        // This makes the whole board visible while we then proceed to reveal 3, 2, 1
        if (nextPickToReveal.SlotNumber == 4)
        {
            var remainingPicks = await _context.DraftPicks
                .Where(p => p.LeagueId == request.LeagueId && p.Season == request.Season && !p.IsRevealed && (p.SlotNumber > 4 || p.SlotNumber == null))
                .ToListAsync(cancellationToken);
            
            foreach (var pick in remainingPicks)
            {
                pick.IsRevealed = true;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var resultDto = new LotteryResultDto
        {
            PickId = nextPickToReveal.Id,
            SlotNumber = nextPickToReveal.SlotNumber ?? 0,
            OriginalOwnerTeamName = nextPickToReveal.OriginalOwner.Name,
            CurrentOwnerTeamName = nextPickToReveal.CurrentOwner.Name,
            Round = nextPickToReveal.Round
        };

        // Broadcast to SignalR Group
        _logger.LogInformation($"[SignalR-Outbound] PickRevealed for League {request.LeagueId}. {SignalRLoggingHelper.GetPayloadInfo(resultDto)}");
        await _hubContext.Clients.Group($"Lottery-{request.LeagueId}").PickRevealed(resultDto);

        return resultDto;
    }
}
