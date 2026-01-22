using FantasyBasket.API.Data;
using FantasyBasket.API.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Draft.GetLotteryProbabilities;

public class GetLotteryProbabilitiesHandler : IRequestHandler<GetLotteryProbabilitiesQuery, Result<List<LotteryProbabilityDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetLotteryProbabilitiesHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<LotteryProbabilityDto>>> Handle(GetLotteryProbabilitiesQuery request, CancellationToken cancellationToken)
    {
        // 1. Get Settings for Playoff Count
        var settings = await _context.LeagueSettings.FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        int playoffTeams = settings?.PlayoffTeams ?? 4;

        // 2. Get Teams
        var teams = await _context.Teams
            .Where(t => t.LeagueId == request.LeagueId)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(cancellationToken);



        // 3. Calculate Standings
        var matchups = await _context.Matchups
            .Where(m => m.LeagueId == request.LeagueId && m.IsPlayed)
            .ToListAsync(cancellationToken);

        var mutableStats = teams.ToDictionary(t => t.Id, t => new MutableTeamStats { 
            TeamId = t.Id, 
            Name = t.Name 
        });

        foreach (var m in matchups)
        {
            if (int.TryParse(m.HomeTeamId, out int hId) && int.TryParse(m.AwayTeamId, out int aId))
            {
                if (mutableStats.ContainsKey(hId) && mutableStats.ContainsKey(aId))
                {
                    if (m.HomeScore > m.AwayScore)
                    {
                        mutableStats[hId].Wins++;
                        mutableStats[aId].Losses++;
                    }
                    else if (m.AwayScore > m.HomeScore)
                    {
                        mutableStats[aId].Wins++;
                        mutableStats[hId].Losses++;
                    }
                }
            }
        }

        var standings = mutableStats.Values
            .Select(t => new 
            {
                t.Name,
                WinPct = (t.Wins + t.Losses) > 0 ? (double)t.Wins / (t.Wins + t.Losses) : 0.0
            })
            .OrderBy(t => t.WinPct) // Worst teams first for lottery
            .ToList();

        // 4. Get Revealed Picks to Exclude
        var revealedTeamIds = await _context.DraftPicks
            .Where(p => p.LeagueId == request.LeagueId 
                     && p.Season == request.Season 
                     && p.Round == 1 
                     && p.IsRevealed)
            .Select(p => p.OriginalOwnerTeamId)
            .ToListAsync(cancellationToken);

        // 6. Calculate Initial Weights & Filter
        bool hasGames = matchups.Any();

        // 5. Determine Lottery Teams (Non-Playoff) based on Standings
        // Note: This matches simple standing logic. Tie-breakers are not fully implemented here but sufficient for odds.
        int lotteryCount;
        if (!hasGames)
        {
            lotteryCount = standings.Count; // Startup: Everyone is in lottery
        }
        else
        {
            lotteryCount = Math.Max(0, standings.Count - playoffTeams);
        }
        
        var lotteryTeams = standings.Take(lotteryCount).ToList();
        
        var result = new List<LotteryProbabilityDto>();
        int totalWeight = 0;
        var activeWeights = new List<(string TeamName, double WinPct, int OriginalIndex, int Weight)>();

        // 6. Calculate Probabilities for ALL teams
        foreach (var t in standings)
        {
            // Find team in lottery list to get index/weight
            var lotteryIndex = lotteryTeams.FindIndex(lt => lt.Name == t.Name);
            int weight = 0;

            if (lotteryIndex != -1 && !revealedTeamIds.Contains(teams.FirstOrDefault(kt => kt.Name == t.Name)?.Id ?? 0))
            {
                if (!hasGames)
                {
                    weight = 100;
                }
                else
                {
                    weight = lotteryIndex switch
                    {
                        0 => 140, 1 => 140, 2 => 140,
                        3 => 125, 4 => 105, 5 => 90,
                        6 => 75, 7 => 60, 8 => 45,
                        9 => 30, 10 => 20, 11 => 15,
                        12 => 10, 13 => 5, _ => 5
                    };
                }
            }

            activeWeights.Add((t.Name, t.WinPct, standings.IndexOf(t) + 1, weight));
            totalWeight += weight;
        }

        // 7. Calculate Normalized Probabilities
        foreach (var item in activeWeights)
        {
            double prob = totalWeight > 0 ? (double)item.Weight / totalWeight : 0;
            result.Add(new LotteryProbabilityDto
            {
                TeamName = item.TeamName,
                WinPct = item.WinPct,
                ProjectedRank = item.OriginalIndex,
                Probability = prob
            });
        }

        return Result<List<LotteryProbabilityDto>>.Success(result);
    }
    private class MutableTeamStats
    {
        public int TeamId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Wins { get; set; }
        public int Losses { get; set; }
    }
}
