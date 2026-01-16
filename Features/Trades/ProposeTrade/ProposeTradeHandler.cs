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
