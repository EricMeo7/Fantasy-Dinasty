using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Team.ReleasePlayer;

public class ReleasePlayerHandler : IRequestHandler<ReleasePlayerCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public ReleasePlayerHandler(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    public async Task<Result<string>> Handle(ReleasePlayerCommand request, CancellationToken cancellationToken)
    {
        var myTeam = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.UserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (myTeam == null) return Result<string>.Failure(ErrorCodes.NOT_IN_LEAGUE);

        var contract = await _context.Contracts
            .Include(c => c.Player)
            .FirstOrDefaultAsync(c => c.PlayerId == request.PlayerId && c.TeamId == myTeam.Id, cancellationToken);

        if (contract == null) return Result<string>.Failure(ErrorCodes.PLAYER_NOT_IN_ROSTER);

        // Process Penalty
        await _auctionService.ProcessDropPenalty(contract, request.UserId, request.LeagueId);

        // Remove Contract
        _context.Contracts.Remove(contract);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<string>.Success(SuccessCodes.PLAYER_RELEASED);
    }
}
