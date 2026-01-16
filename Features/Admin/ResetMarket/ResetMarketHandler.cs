using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.ResetMarket;

public class ResetMarketHandler : IRequestHandler<ResetMarketCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;

    public ResetMarketHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> Handle(ResetMarketCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Reset Market
        var auctions = await _context.Auctions.Where(a => a.LeagueId == request.LeagueId).ToListAsync(cancellationToken);
        _context.Auctions.RemoveRange(auctions);

        var bids = await _context.Bids.Where(b => b.LeagueId == request.LeagueId).ToListAsync(cancellationToken);
        _context.Bids.RemoveRange(bids);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<string>.Success(SuccessCodes.MARKET_RESET);
    }
}
