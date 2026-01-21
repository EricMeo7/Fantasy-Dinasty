using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Services;

public interface ILotteryService
{
    Task<List<DraftPick>> RunLotteryAsync(int leagueId, int season);
}

public class LotteryService : ILotteryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LotteryService> _logger;
    private readonly Random _random;

    public LotteryService(ApplicationDbContext context, ILogger<LotteryService> logger)
    {
        _context = context;
        _logger = logger;
        _random = new Random();
    }

    public async Task<List<DraftPick>> RunLotteryAsync(int leagueId, int season)
    {
        // Get ALL picks for this league and season (Round 1 and future rounds)
        var allPicks = await _context.DraftPicks
            .Include(p => p.OriginalOwner)
            .Where(p => p.LeagueId == leagueId && p.Season == season)
            .ToListAsync();

        if (allPicks.Count == 0)
        {
            _logger.LogWarning("No draft picks found for league {LeagueId} season {Season}", leagueId, season);
            return new List<DraftPick>();
        }

        var round1Picks = allPicks.Where(p => p.Round == 1).ToList();

        // Get team standings (using OriginalOwnerTeamId for lottery eligibility)
        var teamStandings = await GetTeamStandingsAsync(leagueId, season);

        // Check if there are any standings to rely on (Wins/Losses not all 0)
        bool hasStandings = teamStandings.Any(t => t.Wins > 0 || t.Losses > 0);

        // Separate lottery teams (non-playoff) from playoff teams
        var leagueSettings = await _context.LeagueSettings
            .FirstOrDefaultAsync(s => s.LeagueId == leagueId);

        int playoffTeams = leagueSettings?.PlayoffTeams ?? 4;
        // Safety check: if only 2 teams, playoffTeams must be <= 2
        playoffTeams = Math.Min(playoffTeams, teamStandings.Count);

        int lotteryTeamCount;

        if (!hasStandings)
        {
             lotteryTeamCount = teamStandings.Count; // Startup: Everyone in lottery
        }
        else
        {
             lotteryTeamCount = Math.Max(0, teamStandings.Count - playoffTeams);
        }

        // 1. ALL TEAMS ARE NOW LOTTERY TEAMS
        // In this universe, even playoff teams have a tiny chance
        var lotteryTeams = teamStandings
            .OrderBy(t => t.WinPct) // Worst teams first
            .ToList();

        // Get the draft picks for ALL teams
        var lotteryPicks = round1Picks
            .Where(p => lotteryTeams.Any(t => t.TeamId == p.OriginalOwnerTeamId))
            .OrderBy(p => lotteryTeams.FindIndex(t => t.TeamId == p.OriginalOwnerTeamId))
            .ToList();

        // NBA Lottery: Top 4 picks are determined by weighted lottery
        var assignedPicks = new List<DraftPick>();
        var finalTeamOrder = new List<int>();

        // Draw top 4 picks
        int drawsToMake = Math.Min(4, lotteryTeams.Count);

        for (int drawNumber = 1; drawNumber <= drawsToMake && lotteryPicks.Count > 0; drawNumber++)
        {
            var pick = DrawWeightedLotteryPick(lotteryPicks, lotteryTeams, assignedPicks);
            if (pick != null)
            {
                pick.SlotNumber = drawNumber;
                pick.IsRevealed = false; // Secret!
                assignedPicks.Add(pick);
                lotteryPicks.Remove(pick);
                
                finalTeamOrder.Add(pick.OriginalOwnerTeamId);
            }
        }

        // 2. ASSIGN REMAINING SLOTS (5 to N)
        int currentSlot = assignedPicks.Count + 1;
        
        var remainingLotteryPicks = lotteryPicks;
        if (!hasStandings)
            remainingLotteryPicks = remainingLotteryPicks.OrderBy(x => _random.Next()).ToList();
        else
            remainingLotteryPicks = remainingLotteryPicks
                .OrderBy(p => lotteryTeams.FindIndex(t => t.TeamId == p.OriginalOwnerTeamId))
                .ToList();

        foreach (var pick in remainingLotteryPicks)
        {
            pick.SlotNumber = currentSlot++;
            pick.IsRevealed = false; // Secret even for 5-18!
            assignedPicks.Add(pick);
            if (!finalTeamOrder.Contains(pick.OriginalOwnerTeamId))
                finalTeamOrder.Add(pick.OriginalOwnerTeamId);
        }

        // Safety: ensure finalTeamOrder has EVERY team (needed for round 2)
        foreach (var team in teamStandings)
        {
            if (!finalTeamOrder.Contains(team.TeamId))
                finalTeamOrder.Add(team.TeamId);
        }
        
        // --- PROCESS SUBSEQUENT ROUNDS (2, 3, etc.) ---
        // Rookies Draft is usually LINEAR (fixed order based on Round 1)
        var subsequentRounds = allPicks
            .Where(p => p.Round > 1)
            .OrderBy(p => p.Round)
            .ToList();

        foreach (var pick in subsequentRounds)
        {
            // Find the rank of this pick's Original Owner in the Final Order established in Round 1
            int orderIndex = finalTeamOrder.IndexOf(pick.OriginalOwnerTeamId);
            
            int totalTeams = finalTeamOrder.Count;
            int roundOffset = (pick.Round - 1) * totalTeams;
            
            if (orderIndex == -1) orderIndex = totalTeams; // Fallback

            pick.SlotNumber = roundOffset + (orderIndex + 1);
            pick.IsRevealed = true; // Always revealed
            
            assignedPicks.Add(pick);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Lottery completed for league {LeagueId} season {Season}. Assigned {Count} picks.",
            leagueId, season, assignedPicks.Count);

        return assignedPicks;
    }

    private DraftPick? DrawWeightedLotteryPick(
        List<DraftPick> availablePicks,
        List<TeamStanding> lotteryTeams,
        List<DraftPick> alreadyAssigned)
    {
        if (availablePicks.Count == 0) return null;

        // NBA Lottery Odds (simplified version)
        var weights = new List<double>();
        int totalWeight = 0;

        // Check if there are any standings to rely on (Wins/Losses not all 0)
        bool hasStandings = lotteryTeams.Any(t => t.Wins > 0 || t.Losses > 0);

        foreach (var pick in availablePicks)
        {
            int teamRank = lotteryTeams.FindIndex(t => t.TeamId == pick.OriginalOwnerTeamId);
            
            int weight;
            
            if (!hasStandings)
            {
                // Startup Mode: Equal Weight
                weight = 100;
            }
            else
            {
                 // Simplified weight distribution
                weight = teamRank switch
                {
                    0 => 140, // 14.0% for worst team
                    1 => 140,
                    2 => 140,
                    3 => 125,
                    4 => 105,
                    5 => 90,
                    6 => 75,
                    7 => 60,
                    8 => 45,
                    9 => 30,
                    10 => 20,
                    11 => 15,
                    12 => 10,
                    13 => 5,
                    _ => 5
                };
            }

            weights.Add(weight);
            totalWeight += weight;
        }

        // Draw a random number
        int randomValue = _random.Next(0, totalWeight);
        int cumulativeWeight = 0;

        for (int i = 0; i < availablePicks.Count; i++)
        {
            cumulativeWeight += (int)weights[i];
            if (randomValue < cumulativeWeight)
            {
                return availablePicks[i];
            }
        }

        return availablePicks[0];
    }

    private async Task<List<TeamStanding>> GetTeamStandingsAsync(int leagueId, int season)
    {
        var teams = await _context.Teams
            .Where(t => t.LeagueId == leagueId)
            .Select(t => new TeamStanding
            {
                TeamId = t.Id,
                TeamName = t.Name,
                Wins = 0,
                Losses = 0,
                WinPct = 0.0
            })
            .ToListAsync();

        // Calculate standings from matchups
        var matchups = await _context.Matchups
            .Where(m => m.LeagueId == leagueId && m.IsPlayed)
            .ToListAsync();

        foreach (var matchup in matchups)
        {
            // Parse string team IDs to int
            if (!int.TryParse(matchup.HomeTeamId, out int homeTeamId) || 
                !int.TryParse(matchup.AwayTeamId, out int awayTeamId))
                continue;

            var homeTeam = teams.FirstOrDefault(t => t.TeamId == homeTeamId);
            var awayTeam = teams.FirstOrDefault(t => t.TeamId == awayTeamId);

            if (homeTeam == null || awayTeam == null) continue;

            if (matchup.HomeScore > matchup.AwayScore)
            {
                homeTeam.Wins++;
                awayTeam.Losses++;
            }
            else if (matchup.AwayScore > matchup.HomeScore)
            {
                awayTeam.Wins++;
                homeTeam.Losses++;
            }
        }

        // Calculate win percentage
        foreach (var team in teams)
        {
            int totalGames = team.Wins + team.Losses;
            team.WinPct = totalGames > 0 ? (double)team.Wins / totalGames : 0.0;
        }

        return teams.OrderByDescending(t => t.WinPct).ToList();
    }

    private class TeamStanding
    {
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public int Wins { get; set; }
        public int Losses { get; set; }
        public double WinPct { get; set; }
    }
}
