using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Market.GetActiveAuctions;

public class GetActiveAuctionsHandler : IRequestHandler<GetActiveAuctionsQuery, Result<List<ActiveAuctionDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetActiveAuctionsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ActiveAuctionDto>>> Handle(GetActiveAuctionsQuery request, CancellationToken cancellationToken)
    {
        var auctions = await _context.Auctions
            .AsNoTracking()
            .Where(a => a.LeagueId == request.LeagueId && a.IsActive)
            .Select(a => new {
                a.PlayerId,
                a.CurrentOfferTotal,
                a.CurrentOfferYears,
                a.HighBidderId,
                a.EndTime
            })
            .ToListAsync(cancellationToken);

        var bidderIds = auctions
            .Where(a => !string.IsNullOrEmpty(a.HighBidderId))
            .Select(a => a.HighBidderId!)
            .Distinct()
            .ToList();

        var teamsMap = new Dictionary<string, string>();
        if (bidderIds.Any())
        {
            teamsMap = await _context.Teams
                .AsNoTracking()
                .Where(t => bidderIds.Contains(t.UserId) && t.LeagueId == request.LeagueId)
                .Select(t => new { t.UserId, t.Name })
                .ToDictionaryAsync(t => t.UserId, t => t.Name, cancellationToken);
        }

        var result = auctions.Select(a => new ActiveAuctionDto
        {
            PlayerId = a.PlayerId,
            CurrentOffer = a.CurrentOfferTotal,
            CurrentYears = a.CurrentOfferYears,
            HighBidderName = !string.IsNullOrEmpty(a.HighBidderId) 
                ? teamsMap.GetValueOrDefault(a.HighBidderId, "Sconosciuto") 
                : string.Empty,
            EndTime = a.EndTime
        }).ToList();

        return Result<List<ActiveAuctionDto>>.Success(result);
    }
}
