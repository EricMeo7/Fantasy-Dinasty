using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;


using FantasyBasket.API.Services;
using FantasyBasket.API.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using FantasyBasket.API.Models;

namespace FantasyBasket.API.Features.Market.GetFreeAgents;

public class GetFreeAgentsHandler : IRequestHandler<GetFreeAgentsQuery, Result<List<FreeAgentDto>>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;
    private readonly INbaDataService _nbaDataService;
    private readonly IMemoryCache _cache;

    public GetFreeAgentsHandler(ApplicationDbContext context, AuctionService auctionService, INbaDataService nbaDataService, IMemoryCache cache)
    {
        _context = context;
        _auctionService = auctionService;
        _nbaDataService = nbaDataService;
        _cache = cache;
    }

    public async Task<Result<List<FreeAgentDto>>> Handle(GetFreeAgentsQuery request, CancellationToken cancellationToken)
    {
        var leagueId = request.LeagueId;
        string cacheKey = $"free_agents_{leagueId}";

        if (_cache.TryGetValue(cacheKey, out List<FreeAgentDto>? cachedResults) && cachedResults != null)
        {
            return Result<List<FreeAgentDto>>.Success(cachedResults);
        }

        // ...

        // 1. Process expired auctions ON DEMAND to ensure instant updates
        await _auctionService.ProcessExpiredAuctionsAsync(cancellationToken, leagueId);

        try
        {
            // FETCH LEAGUE SETTINGS FOR SCORING
            var settings = await _context.LeagueSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
            
            // Default weights if settings missing
            double wP = settings?.PointWeight ?? 1.0;
            double wR = settings?.ReboundWeight ?? 1.2;
            double wA = settings?.AssistWeight ?? 1.5;
            double wS = settings?.StealWeight ?? 3.0;
            double wB = settings?.BlockWeight ?? 3.0;
            double wT = settings?.TurnoverWeight ?? -1.0;
            
            // Advanced Weights
            double wFgm = settings?.FgmWeight ?? 0.0;
            double wFga = settings?.FgaWeight ?? 0.0;
            double wFtm = settings?.FtmWeight ?? 0.0;
            double wFta = settings?.FtaWeight ?? 0.0;
            double w3Pm = settings?.ThreePmWeight ?? 0.0;
            double w3Pa = settings?.ThreePaWeight ?? 0.0;
            double wOr = settings?.OrebWeight ?? 0.0;
            double wDr = settings?.DrebWeight ?? 0.0;
            double wWin = settings?.WinWeight ?? 0.0;
            double wLoss = settings?.LossWeight ?? 0.0;

            // STEP 1: LIGHTWEIGHT QUERY (Ids Only)
            // Improves Performance & Avoids RESOURCE_SEMAPHORE
            
            var baseQuery = from p in _context.Players.AsNoTracking()
                            
                            // Check Contracts (Filter)
                            join c in _context.Contracts.AsNoTracking().Where(x => x.Team.LeagueId == leagueId) 
                            on p.Id equals c.PlayerId into contracts
                            where !contracts.Any() // Exclude rostered

                            // Check Auctions (For Ordering)
                            join a in _context.Auctions.AsNoTracking().Where(x => x.LeagueId == leagueId && x.IsActive)
                            on p.Id equals a.PlayerId into auctions
                            from auction in auctions.DefaultIfEmpty()

                            // DYNAMIC SCORING CALCULATION
                            // Must match FantasyPointCalculator logic
                            let winBonus = p.WinPct * wWin
                            let lossMalus = (1.0 - p.WinPct) * wLoss
                            
                            let dynFpt = (p.AvgPoints * wP) + 
                                         (p.AvgRebounds * wR) + 
                                         (p.AvgAssists * wA) + 
                                         (p.AvgSteals * wS) + 
                                         (p.AvgBlocks * wB) + 
                                         (p.AvgTurnovers * wT) +
                                         (p.OffRebounds * wOr) +
                                         (p.DefRebounds * wDr) +
                                         (p.Fgm * wFgm) + (p.Fga * wFga) +
                                         (p.Ftm * wFtm) + (p.Fta * wFta) +
                                         (p.ThreePm * w3Pm) + (p.ThreePa * w3Pa) +
                                         winBonus + lossMalus

                            select new 
                            { 
                                p.Id, 
                                CalculatedFpt = dynFpt, 
                                HasActiveAuction = auction != null 
                            };

            // Order by Auction, then Dynamic Fantasy Points.
            var sortedItems = await baseQuery
                .OrderByDescending(x => x.HasActiveAuction)
                .ThenByDescending(x => x.CalculatedFpt)
                .ToListAsync(cancellationToken);

            var sortedIds = sortedItems.Select(x => x.Id).ToList();
            if (!sortedIds.Any()) return Result<List<FreeAgentDto>>.Success(new List<FreeAgentDto>());

            // STEP 2: FETCH MINIMAL FULL DATA
            var prevSeason = _nbaDataService.GetPreviousSeason();
            var players = await _context.Players
                .AsNoTracking()
                .Where(p => sortedIds.Contains(p.Id))
                .Select(p => new {
                    p.Id,
                    p.ExternalId,
                    p.FirstName,
                    p.LastName,
                    p.NbaTeam,
                    p.Position,
                    p.AvgPoints,
                    p.AvgRebounds,
                    p.AvgAssists,
                    p.AvgSteals,
                    p.AvgBlocks,
                    p.AvgTurnovers,
                    p.FgPercent,
                    p.Fgm, p.Fga, p.Ftm, p.Fta, p.ThreePm, p.ThreePa,
                    p.OffRebounds, p.DefRebounds, p.WinPct,
                    p.GamesPlayed,
                    p.InjuryStatus,
                    p.InjuryBodyPart,
                    SeasonStats = p.SeasonStats
                        .Where(s => s.Season == prevSeason)
                        .Select(s => new {
                            s.Season,
                            s.AvgPoints,
                            s.AvgRebounds,
                            s.AvgAssists,
                            s.AvgSteals,
                            s.AvgBlocks,
                            s.AvgTurnovers,
                            s.Fgm, s.Fga, s.Ftm, s.Fta, s.ThreePm, s.ThreePa,
                            s.OffRebounds, s.DefRebounds, s.WinPct
                        })
                        .ToList()
                })
                .ToListAsync(cancellationToken);

            var activeAuctions = await _context.Auctions
                .AsNoTracking()
                .Where(a => a.LeagueId == leagueId && a.IsActive)
                .Select(a => new {
                    a.PlayerId,
                    a.EndTime,
                    a.CurrentOfferTotal,
                    a.CurrentOfferYears,
                    a.HighBidderId
                })
                .ToListAsync(cancellationToken);
            
            var bidderIds = activeAuctions.Select(a => a.HighBidderId).Where(id => id != null).Distinct().ToList();
            var teamsMap = new Dictionary<string, string>();
            if (bidderIds.Any())
            {
                teamsMap = await _context.Teams
                    .AsNoTracking()
                    .Where(t => t.LeagueId == leagueId && bidderIds.Contains(t.UserId))
                    .Select(t => new { t.UserId, t.Name })
                    .ToDictionaryAsync(t => t.UserId, t => t.Name, cancellationToken);
            }

            // STEP 3: MERGE
            var playerMap = players.ToDictionary(p => p.Id);
            var auctionMap = activeAuctions.ToDictionary(a => a.PlayerId);

            var result = new List<FreeAgentDto>(sortedIds.Count);

            foreach (var id in sortedIds)
            {
                if (!playerMap.TryGetValue(id, out var p)) continue;

                var auction = auctionMap.GetValueOrDefault(id);
                string bidderName = "";
                if (auction?.HighBidderId != null)
                {
                    bidderName = teamsMap.GetValueOrDefault(auction.HighBidderId, "Sconosciuto");
                }

                // DYNAMIC FPT CALCULATION (In Memory for specific players)
                double currentFpt = FantasyPointCalculator.Calculate(
                    p.AvgPoints, p.AvgRebounds, p.AvgAssists, p.AvgSteals, p.AvgBlocks, p.AvgTurnovers,
                    p.Fgm, p.Fga, p.Ftm, p.Fta, p.ThreePm, p.ThreePa,
                    p.OffRebounds, p.DefRebounds, 
                    false, // Won handled by win bonus
                    settings ?? new LeagueSettings()
                ) - (settings?.LossWeight ?? 0) // Neutralize implicit LossWeight
                  + (p.WinPct * (settings?.WinWeight ?? 0)) + ((1.0 - p.WinPct) * (settings?.LossWeight ?? 0));

                // Calculate Base Price (Min Bid) using DYNAMIC STATS from Previous Season if available
                var prevStatObj = p.SeasonStats.FirstOrDefault(s => s.Season == prevSeason);
                double baseVal = currentFpt; // Fallback to current

                if (prevStatObj != null)
                {
                    // Recalculate based on historical averages using current weights
                    baseVal = FantasyPointCalculator.Calculate(
                        prevStatObj.AvgPoints, prevStatObj.AvgRebounds, prevStatObj.AvgAssists, prevStatObj.AvgSteals, prevStatObj.AvgBlocks, prevStatObj.AvgTurnovers,
                        prevStatObj.Fgm, prevStatObj.Fga, prevStatObj.Ftm, prevStatObj.Fta, prevStatObj.ThreePm, prevStatObj.ThreePa,
                        prevStatObj.OffRebounds, prevStatObj.DefRebounds,
                        false,
                        settings ?? new LeagueSettings()
                    ) - (settings?.LossWeight ?? 0) // Neutralize implicit LossWeight from Calculate(false)
                      + (prevStatObj.WinPct * (settings?.WinWeight ?? 0)) + ((1.0 - prevStatObj.WinPct) * (settings?.LossWeight ?? 0));
                }

                double minBid = Math.Max(1, Math.Round(baseVal, MidpointRounding.AwayFromZero));

                // STAT FALLBACK LOGIC
                var prevStat = p.SeasonStats.FirstOrDefault(s => s.Season == prevSeason);
                
                // If player has played 0 games this season, fallback to previous season averages
                bool useFallback = p.AvgPoints == 0 && p.AvgRebounds == 0 && p.AvgAssists == 0 && prevStat != null;

                double displayPts = useFallback ? prevStat!.AvgPoints : p.AvgPoints;
                double displayReb = useFallback ? prevStat!.AvgRebounds : p.AvgRebounds;
                double displayAst = useFallback ? prevStat!.AvgAssists : p.AvgAssists;
                double displayFpt = currentFpt;

                if (useFallback)
                {
                    // Recalculate FPT based on previous season stats using CURRENT league weights
                    displayFpt = FantasyPointCalculator.Calculate(
                        prevStat.AvgPoints, prevStat.AvgRebounds, prevStat.AvgAssists, prevStat.AvgSteals, prevStat.AvgBlocks, prevStat.AvgTurnovers,
                        prevStat.Fgm, prevStat.Fga, prevStat.Ftm, prevStat.Fta, prevStat.ThreePm, prevStat.ThreePa,
                        prevStat.OffRebounds, prevStat.DefRebounds,
                        false,
                        settings ?? new LeagueSettings()
                    ) - (settings?.LossWeight ?? 0)
                      + (prevStat.WinPct * (settings?.WinWeight ?? 0)) + ((1.0 - prevStat.WinPct) * (settings?.LossWeight ?? 0));
                }

                result.Add(new FreeAgentDto
                {
                   Id = p.Id,
                   ExternalId = p.ExternalId,
                   FirstName = p.FirstName,
                   LastName = p.LastName,
                   NbaTeam = p.NbaTeam,
                   Position = p.Position,
                   AvgPoints = displayPts,
                   AvgFantasyPoints = displayFpt,
                   AvgRebounds = displayReb,
                   AvgAssists = displayAst,
                   FgPercent = p.FgPercent,
                   InjuryStatus = p.InjuryStatus,
                   InjuryBodyPart = p.InjuryBodyPart,
                   HasActiveAuction = auction != null,
                   AuctionEndTime = auction?.EndTime,
                   CurrentOffer = auction?.CurrentOfferTotal ?? 0,
                   CurrentYears = auction?.CurrentOfferYears ?? 0,
                   HighBidderName = bidderName,
                   MinBid = minBid
                });
            }

            // Cache the result for 60 seconds
            _cache.Set(cacheKey, result, TimeSpan.FromSeconds(60));

            return Result<List<FreeAgentDto>>.Success(result);
        }
        catch (Exception ex)
        {
            return Result<List<FreeAgentDto>>.Failure($"DB_ERROR: {ex.Message}");
        }
    }
}
