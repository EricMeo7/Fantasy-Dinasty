using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Trades.GetMyTrades;

public class GetMyTradesHandler : IRequestHandler<GetMyTradesQuery, Result<List<TradeDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetMyTradesHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<TradeDto>>> Handle(GetMyTradesQuery request, CancellationToken cancellationToken)
    {
        var trades = await _context.Trades
            .Where(t => t.LeagueId == request.LeagueId && t.Status == TradeStatus.Pending)
            .Where(t => t.Offers.Any(o => o.ToUserId == request.UserId || o.FromUserId == request.UserId) || t.ProposerId == request.UserId)
            .AsNoTracking()
            .Select(t => new 
            {
                t.Id,
                t.ProposerId,
                t.Status,
                t.CreatedAt,
                Offers = t.Offers.Select(o => new {
                     o.FromUserId,
                     o.ToUserId,
                     o.PlayerId,
                     o.Player!.FirstName,
                     o.Player!.LastName,
                     o.Player!.Position,
                     o.Player!.ExternalId
                }).ToList(),
                Acceptances = t.Acceptances.Select(a => a.UserId).ToList()
            })
            .ToListAsync(cancellationToken);
            
        // Client-side sort to save SQL memory
        trades = trades.OrderByDescending(t => t.CreatedAt).ToList();

        // Fetch all team names involved to avoid N+1 in mapping
        var teamUserIds = trades.SelectMany(t => t.Offers.SelectMany(o => new[] { o.FromUserId, o.ToUserId }))
            .Distinct()
            .ToList();

        var teamsMap = await _context.Teams
            .Where(t => t.LeagueId == request.LeagueId && teamUserIds.Contains(t.UserId))
            .AsNoTracking()
            .Select(t => new { t.UserId, t.Id, t.Name })
            .ToDictionaryAsync(t => t.UserId, t => new { t.Id, t.Name }, cancellationToken);

        var result = trades.Select(t =>
        {
            var acceptedIds = t.Acceptances;
            var isMeProposer = t.ProposerId == request.UserId;
            var didIAccept = acceptedIds.Contains(request.UserId);
            var isUserInvolved = t.Offers.Any(o => o.FromUserId == request.UserId || o.ToUserId == request.UserId);
            var canIAccept = !isMeProposer && !didIAccept && isUserInvolved;

            return new TradeDto
            {
                Id = t.Id,
                ProposerId = t.ProposerId,
                Status = t.Status.ToString(),
                CreatedAt = t.CreatedAt,
                AcceptedUserIds = acceptedIds,
                IsMeProposer = isMeProposer,
                DidIAccept = didIAccept,
                CanIAccept = canIAccept,
                Offers = t.Offers.Select(o => 
                {
                    var fromTeam = teamsMap.GetValueOrDefault(o.FromUserId);
                    var toTeam = teamsMap.GetValueOrDefault(o.ToUserId);

                    return new TradeOfferDto
                    {
                        FromUserId = o.FromUserId,
                        FromTeamId = fromTeam?.Id ?? 0,
                        FromTeamName = fromTeam?.Name ?? "N/A",
                        ToUserId = o.ToUserId,
                        ToTeamId = toTeam?.Id ?? 0,
                        ToTeamName = toTeam?.Name ?? "N/A",
                        PlayerId = o.PlayerId,
                        PlayerName = $"{o.FirstName} {o.LastName}",
                        PlayerPosition = o.Position,
                        PlayerExternalId = o.ExternalId
                    };
                }).ToList()
            };
        }).ToList();

        return Result<List<TradeDto>>.Success(result);
    }
}
