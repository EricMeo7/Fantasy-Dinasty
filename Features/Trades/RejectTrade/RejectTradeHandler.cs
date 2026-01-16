using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Trades.RejectTrade;

public class RejectTradeHandler : IRequestHandler<RejectTradeCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;

    public RejectTradeHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> Handle(RejectTradeCommand request, CancellationToken cancellationToken)
    {
        var trade = await _context.Trades
            .Include(t => t.Offers)
            .FirstOrDefaultAsync(t => t.Id == request.TradeId && t.LeagueId == request.LeagueId, cancellationToken);

        if (trade == null) return Result<string>.Failure(ErrorCodes.TRADE_NOT_FOUND);

        if (trade.Status != TradeStatus.Pending) return Result<string>.Failure(ErrorCodes.TRADE_NOT_PENDING);

        // If proposer, cancel it
        if (trade.ProposerId == request.UserId)
        {
            trade.Status = TradeStatus.Cancelled;
            await _context.SaveChangesAsync(cancellationToken);
            return Result<string>.Success("Proposta annullata con successo.");
        }

        // If recipient, reject it
        bool isInvolved = trade.Offers.Any(o => o.ToUserId == request.UserId || o.FromUserId == request.UserId);
        if (!isInvolved) return Result<string>.Failure(ErrorCodes.NOT_AUTHORIZED);

        trade.Status = TradeStatus.Rejected;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<string>.Success("Scambio rifiutato.");
    }
}
