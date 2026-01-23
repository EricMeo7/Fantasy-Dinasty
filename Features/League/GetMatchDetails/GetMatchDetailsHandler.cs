using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using FantasyBasket.API.Services;

namespace FantasyBasket.API.Features.League.GetMatchDetails;

public class GetMatchDetailsHandler : 
    IRequestHandler<GetMatchDetailsQuery, Result<MatchDetailsResponseDto>>,
    IRequestHandler<GetCurrentMatchupQuery, Result<MatchDetailsResponseDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly DateTime _seasonStartFallback = new DateTime(2025, 10, 22);

    public GetMatchDetailsHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<Result<MatchDetailsResponseDto>> Handle(GetMatchDetailsQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = $"match_details_{request.MatchId}";
        if (_cache.TryGetValue(cacheKey, out MatchDetailsResponseDto? cached))
        {
            return Result<MatchDetailsResponseDto>.Success(cached!);
        }

        var match = await _context.Matchups
            .AsNoTracking()
            .OrderBy(m => m.Id)
            .FirstOrDefaultAsync(m => m.Id == request.MatchId && m.LeagueId == request.LeagueId, cancellationToken);

        if (match == null) return Result<MatchDetailsResponseDto>.Failure(ErrorCodes.MATCH_NOT_FOUND);

        var response = await BuildMatchResponse(match, request.LeagueId, cancellationToken);
        if (response.IsSuccess)
        {
            _cache.Set(cacheKey, response.Value, TimeSpan.FromSeconds(30));
        }
        return response;
    }

    public async Task<Result<MatchDetailsResponseDto>> Handle(GetCurrentMatchupQuery request, CancellationToken cancellationToken)
    {
        var match = await _context.Matchups
            .AsNoTracking()
            .Where(m => m.LeagueId == request.LeagueId && !m.IsPlayed)
            .Where(m => m.HomeTeamId == request.UserId || m.AwayTeamId == request.UserId)
            .OrderBy(m => m.WeekNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (match == null) return Result<MatchDetailsResponseDto>.Failure(ErrorCodes.NO_UPCOMING_MATCH);

        // For "Current Matchup", we use a different cache key or shorter duration if we want instant switch after game starts
        return await BuildMatchResponse(match, request.LeagueId, cancellationToken);
    }

    private async Task<Result<MatchDetailsResponseDto>> BuildMatchResponse(Matchup match, int leagueId, CancellationToken ct)
    {
        var leagueData = await _context.Leagues
            .AsNoTracking()
            .Where(l => l.Id == leagueId)
            .OrderBy(l => l.Id)
            .Select(l => new { l.SeasonStartDate })
            .FirstOrDefaultAsync(ct);
        
        // FETCH SETTINGS
        var settings = await _context.LeagueSettings.AsNoTracking()
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(s => s.LeagueId == leagueId, ct);
        var weights = new ScoringWeights 
        {
            P = settings?.PointWeight ?? 1.0,
            R = settings?.ReboundWeight ?? 1.2,
            A = settings?.AssistWeight ?? 1.5,
            S = settings?.StealWeight ?? 3.0,
            B = settings?.BlockWeight ?? 3.0,
            T = settings?.TurnoverWeight ?? -1.0
        };

        DateTime startDate = leagueData?.SeasonStartDate ?? _seasonStartFallback;
        DateTime weekStart, weekEnd;

        if (match.StartAt.HasValue && match.EndAt.HasValue)
        {
             weekStart = match.StartAt.Value;
             weekEnd = match.EndAt.Value.AddDays(-1);
        }
        else
        {
             weekStart = startDate.AddDays((match.WeekNumber - 1) * 7);
             weekEnd = weekStart.AddDays(6);
        }

        var teamsData = await _context.Teams
            .AsNoTracking()
            .Where(t => (t.UserId == match.HomeTeamId || t.UserId == match.AwayTeamId) && t.LeagueId == leagueId)
            .Select(t => new { t.Id, t.UserId, t.Name })
            .ToListAsync(ct);

        var homeTeam = teamsData.FirstOrDefault(t => t.UserId == match.HomeTeamId);
        var awayTeam = teamsData.FirstOrDefault(t => t.UserId == match.AwayTeamId);

        if (homeTeam == null || awayTeam == null) 
            return Result<MatchDetailsResponseDto>.Failure(ErrorCodes.TEAMS_NOT_FOUND);

        var response = new MatchDetailsResponseDto
        {
            Id = match.Id,
            LeagueId = leagueId,
            WeekNumber = match.WeekNumber,
            WeekStartDate = weekStart,
            WeekEndDate = weekEnd,
            IsPlayed = match.IsPlayed,
            
            HomeTeam = homeTeam.Name,
            HomeTeamId = homeTeam.Id,
            HomeUserId = homeTeam.UserId,
            HomeScore = match.HomeScore,
            
            AwayTeam = awayTeam.Name,
            AwayTeamId = awayTeam.Id,
            AwayUserId = awayTeam.UserId,
            AwayScore = match.AwayScore
        };

        response.HomePlayers = await GetRosterWithStats(homeTeam.Id, weekStart, settings ?? new LeagueSettings(), ct);
        response.AwayPlayers = await GetRosterWithStats(awayTeam.Id, weekStart, settings ?? new LeagueSettings(), ct);

        // BEST BALL LOGIC: The team score is the SUM of the WeeklyScores (which are the MAX valid starter scores)
        response.HomeScore = response.HomePlayers.Sum(p => p.WeeklyScore);
        response.AwayScore = response.AwayPlayers.Sum(p => p.WeeklyScore);

        return Result<MatchDetailsResponseDto>.Success(response);
    }

    private class ScoringWeights { public double P; public double R; public double A; public double S; public double B; public double T; }

    private async Task<List<MatchPlayerDto>> GetRosterWithStats(int teamId, DateTime weekStart, LeagueSettings settings, CancellationToken ct)
    {
        var todayStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var weekEnd = weekStart.AddDays(7);
        var sDateStr = weekStart.ToString("yyyy-MM-dd");
        var eDateStr = weekEnd.ToString("yyyy-MM-dd");

        // 1. Get ALL DailyLineups for the week where the player was a STARTER
        // Capture the SLOT (PG, SG, etc.) to enforce "Best per Slot" logic
        var weekStarterLineups = await _context.DailyLineups
            .AsNoTracking()
            .Where(d => d.TeamId == teamId && d.Date >= weekStart.Date && d.Date < weekEnd.Date && d.IsStarter)
            .Select(d => new { d.PlayerId, DateStr = d.Date.ToString("yyyy-MM-dd"), d.Slot })
            .ToListAsync(ct);
        
        // Dictionary to map (Player, Date) -> List of Slots (in case of double headers? rare but possible)
        // Usually 1 slot per day.
        var starterSlots = weekStarterLineups
            .GroupBy(x => new { x.PlayerId, x.DateStr })
            .ToDictionary(g => g.Key, g => g.First().Slot); // Assume 1 slot per player per day

        // 2. Get roster data
        var rosterData = await _context.Contracts
            .AsNoTracking()
            .Where(c => c.TeamId == teamId)
            .Select(c => new 
            {
                c.PlayerId,
                c.Player.FirstName,
                c.Player.LastName,
                c.Player.Position,
                c.Player.NbaTeam
            })
            .ToListAsync(ct);

        var playerIds = rosterData.Select(x => x.PlayerId).ToList();
        var dailyLogs = new Dictionary<int, double>();
        // We will repurpose weeklyLogs to hold personal bests, but identifying slot winners is separate
        var personalWeeklyBests = new Dictionary<int, double>(); 
        var bestScoreDates = new Dictionary<int, string>();
        
        // This will hold the "Winning Score" for the team calculation, not attached to typical map
        // But we need to calculate it for the handler's summation logic. 
        // Actually, the handler sums `MatchPlayerDto.WeeklyScore`. 
        // So we must ensure that ONLY Slot Winners have a WeeklyScore > 0? 
        // OR we return a special calculation.
        // The user wants "TOTALE SETTIMANA: 128.8" which is sum of ONLY winners.
        // So `WeeklyScore` should be 0 if you are not a winner? 
        // That hides performance. 
        // Let's create `FantasyContribution` property? No, DTO change.
        // Let's set `WeeklyScore` to Contribution (0 for Bam) to ensure total is correct.
        // Visuals can still show personal performance via `TodayScore` or real points in game.
        // But `CourtPlayerCard` shows `WeeklyScore`. showing 0 for Bam (42.9) is harsh.
        // However, `HomeScore` calculation in `BuildMatchResponse` is `Sum(p => p.WeeklyScore)`.
        // To fix Total WITHOUT hiding Bam's max:
        // We should calculate `HomeScore` differently in `BuildMatchResponse` (NOT filtering roster).
        // But `GetRosterWithStats` returns the list.
        // Let's stick to: `WeeklyScore` = Contribution.
        // Bam sees 0.0 (Green Badge removed anyway).
        // So user just sees Bam 42.9 (Real points daily) but no "Weekly" total.
        // This is consistent with Best Ball: If you didn't count, you got 0.
        
        if (playerIds.Any())
        {
            var logs = await _context.PlayerGameLogs
                .AsNoTracking()
                .Where(l => l.GameDate.CompareTo(sDateStr) >= 0 && l.GameDate.CompareTo(eDateStr) < 0 && playerIds.Contains(l.PlayerId))
                .Select(l => new { 
                    l.PlayerId, 
                    l.GameDate,
                    l.Points,
                    l.Rebounds,
                    l.Assists,
                    l.Steals,
                    l.Blocks,
                    l.Turnovers,
                    l.Fgm, l.Fga, l.Ftm, l.Fta, l.ThreePm, l.ThreePa,
                    l.OffRebounds, l.DefRebounds, l.Won
                })
                .ToListAsync(ct);

            var calculatedLogs = logs.Select(l => new 
            {
                l.PlayerId,
                l.GameDate,
                FantasyPoints = FantasyPointCalculator.Calculate(
                    l.Points, l.Rebounds, l.Assists, l.Steals, l.Blocks, l.Turnovers,
                    l.Fgm, l.Fga, l.Ftm, l.Fta, l.ThreePm, l.ThreePa,
                    l.OffRebounds, l.DefRebounds, l.Won,
                    settings
                )
            }).ToList();

            // 3. Daily score (what they did TODAY, regardless of lineup)
            dailyLogs = calculatedLogs
                .Where(l => l.GameDate == todayStr)
                .ToDictionary(l => l.PlayerId, l => l.FantasyPoints);
            
            // 4. Map Valid Logs to Slots
            var slotPerformances = calculatedLogs
                .Where(l => starterSlots.ContainsKey(new { l.PlayerId, DateStr = l.GameDate }))
                .Select(l => new 
                {
                    l.PlayerId,
                    l.GameDate,
                    l.FantasyPoints,
                    Slot = starterSlots[new { l.PlayerId, DateStr = l.GameDate }]
                })
                .ToList();

            // 5. Determine Slot Winners (Best Ball Logic)
            // Group by SLOT -> Take Max
            var slotWinners = slotPerformances
                .GroupBy(x => x.Slot)
                .Select(g => g.OrderByDescending(x => x.FantasyPoints).First())
                .ToList();

            // 6. Map contributions
            // A player can technically win multiple slots on different days. Sum their contributions.
            var playerContributions = slotWinners
                .GroupBy(x => x.PlayerId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.FantasyPoints)); // Sum in case of multi-slot wins

            // 7. Track Winning Dates for Crown
            var winningEvents = new HashSet<(int, string)>(slotWinners.Select(x => (x.PlayerId, x.GameDate)));
            
            bestScoreDates = slotWinners
                .GroupBy(x => x.PlayerId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.FantasyPoints).First().GameDate // Show the date of their biggest win
                );
            
            // To ensure HomeScore/AwayScore is correct, we populate WeeklyScore with the Contribution
            personalWeeklyBests = playerContributions; 
        }

        return rosterData.Select(c => new MatchPlayerDto
        {
            Id = c.PlayerId,
            Name = $"{(c.FirstName.Length > 0 ? c.FirstName.Substring(0, 1) : "")}. {c.LastName}",
            Position = c.Position,
            NbaTeam = c.NbaTeam,
            TodayScore = dailyLogs.GetValueOrDefault(c.PlayerId, 0),
            // WeeklyScore now represents CONTRIBUTION to the Best Ball total
            // Bam (42.9) gets 0 here because Duren (48.0) beat him in C slot.
            WeeklyScore = personalWeeklyBests.GetValueOrDefault(c.PlayerId, 0),
            BestScoreDate = bestScoreDates.ContainsKey(c.PlayerId) ? bestScoreDates[c.PlayerId] : null,
            Status = "Active"
        }).ToList();
    }
}
