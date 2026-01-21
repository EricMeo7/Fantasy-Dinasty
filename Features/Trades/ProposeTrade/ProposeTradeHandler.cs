using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Trades.ProposeTrade;

public class ProposeTradeHandler : IRequestHandler<ProposeTradeCommand, Result<int>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public ProposeTradeHandler(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    public async Task<Result<int>> Handle(ProposeTradeCommand request, CancellationToken cancellationToken)
    {
        // 1. Map to models
        var offers = request.Offers.Select(o => new TradeOffer
        {
            FromUserId = o.FromUserId,
            ToUserId = o.ToUserId,
            PlayerId = o.PlayerId
        }).ToList();

        // 2. Financial Validation
        try
        {
            await _auctionService.ValidateTradeFinancials(offers, request.LeagueId);

            // 2b. Roster Limit Validation
            var involvedRecipients = offers.Select(o => o.ToUserId).Distinct().ToList();
            foreach (var recipientUserId in involvedRecipients)
            {
                var incomingPlayers = offers.Where(o => o.ToUserId == recipientUserId).Select(o => o.PlayerId).ToList();
                var outgoingPlayers = offers.Where(o => o.FromUserId == recipientUserId).Select(o => o.PlayerId).ToList();

                var currentContracts = await _context.Contracts
                    .Where(c => c.Team.UserId == recipientUserId && c.Team.LeagueId == request.LeagueId)
                    .Select(c => new { c.PlayerId, c.Player.Position })
                    .AsNoTracking()
                    .ToListAsync();

                var positionsAfterTrade = currentContracts
                    .Where(c => !outgoingPlayers.Contains(c.PlayerId))
                    .Select(c => c.Position)
                    .ToList();

                var incomingPositions = await _context.Players
                    .Where(p => incomingPlayers.Contains(p.Id))
                    .Select(p => p.Position)
                    .AsNoTracking()
                    .ToListAsync();
                
                positionsAfterTrade.AddRange(incomingPositions);

                var validationResult = await _auctionService.ValidateRosterStateAsync(positionsAfterTrade, request.LeagueId);
                if (!validationResult.IsSuccess)
                {
                    return Result<int>.Failure(validationResult.Error ?? ErrorCodes.INTERNAL_ERROR);
                }
            }
        }
        catch (InvalidOperationException ex)
        {
            return Result<int>.Failure(ex.Message);
        }

        // 3. Save
        var trade = new Trade
        {
            LeagueId = request.LeagueId,
            ProposerId = request.ProposerId,
            Status = TradeStatus.Pending,
            Offers = offers
        };

        _context.Trades.Add(trade);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(trade.Id);
    }
}
