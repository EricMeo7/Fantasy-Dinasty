using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.GetMatchDetails;

public class GetMatchDetailsHandler : 
    IRequestHandler<GetMatchDetailsQuery, Result<MatchDetailsResponseDto>>,
    IRequestHandler<GetCurrentMatchupQuery, Result<MatchDetailsResponseDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly DateTime _seasonStartFallback = new DateTime(2025, 10, 22);

    public GetMatchDetailsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<MatchDetailsResponseDto>> Handle(GetMatchDetailsQuery request, CancellationToken cancellationToken)
    {
        var match = await _context.Matchups
            .FirstOrDefaultAsync(m => m.Id == request.MatchId && m.LeagueId == request.LeagueId, cancellationToken);

        if (match == null) return Result<MatchDetailsResponseDto>.Failure(ErrorCodes.MATCH_NOT_FOUND);

        return await BuildMatchResponse(match, request.LeagueId, cancellationToken);
    }

    public async Task<Result<MatchDetailsResponseDto>> Handle(GetCurrentMatchupQuery request, CancellationToken cancellationToken)
    {
        var match = await _context.Matchups
            .Where(m => m.LeagueId == request.LeagueId && !m.IsPlayed)
            .Where(m => m.HomeTeamId == request.UserId || m.AwayTeamId == request.UserId)
            .OrderBy(m => m.WeekNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (match == null) return Result<MatchDetailsResponseDto>.Failure(ErrorCodes.NO_UPCOMING_MATCH);

        return await BuildMatchResponse(match, request.LeagueId, cancellationToken);
    }

    private async Task<Result<MatchDetailsResponseDto>> BuildMatchResponse(Matchup match, int leagueId, CancellationToken ct)
    {
        var league = await _context.Leagues.FindAsync(new object[] { leagueId }, ct);
        
        // FETCH SETTINGS
        var settings = await _context.LeagueSettings.AsNoTracking().FirstOrDefaultAsync(s => s.LeagueId == leagueId, ct);
        var weights = new ScoringWeights 
        {
            P = settings?.PointWeight ?? 1.0,
            R = settings?.ReboundWeight ?? 1.2,
            A = settings?.AssistWeight ?? 1.5,
            S = settings?.StealWeight ?? 3.0,
            B = settings?.BlockWeight ?? 3.0,
            T = settings?.TurnoverWeight ?? -1.0
        };

        DateTime startDate = league?.SeasonStartDate ?? _seasonStartFallback;
        DateTime weekStart, weekEnd;

        if (match.StartAt.HasValue && match.EndAt.HasValue)
        {
             weekStart = match.StartAt.Value;
             // EndAt is the *start* of next slot in DB logic. 
             // For display/logic inclusive range, we typically want up to that moment. 
             // But UI often treats end date as inclusive day. 
             // Let's pass the exact bound and let UI decide (-1 day).
             // Actually, consistency with GetMatchups: 
             // GetMatchupsHandler did .AddDays(-1).
             // Let's keep raw here or adjust?
             // MatchDetailDtos usually carries "The period".
             // Let's pass the raw boundary or inclusive?
             // If I pass raw EndAt (e.g. Monday midnight), UI looping <= diffDays might include Monday.
             // If I pass Sunday 23:59...
             // Let's pass `match.EndAt.Value.AddDays(-1)` as the "Last Display Date".
             weekEnd = match.EndAt.Value.AddDays(-1);
        }
        else
        {
             weekStart = startDate.AddDays((match.WeekNumber - 1) * 7);
             weekEnd = weekStart.AddDays(6);
        }

        var homeTeam = await _context.Teams.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == match.HomeTeamId && t.LeagueId == leagueId, ct);
        var awayTeam = await _context.Teams.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == match.AwayTeamId && t.LeagueId == leagueId, ct);

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

        response.HomePlayers = await GetRosterWithStats(homeTeam.Id, weekStart, weights, ct);
        response.AwayPlayers = await GetRosterWithStats(awayTeam.Id, weekStart, weights, ct);

        return Result<MatchDetailsResponseDto>.Success(response);
    }

    private class ScoringWeights { public double P; public double R; public double A; public double S; public double B; public double T; }

    private async Task<List<MatchPlayerDto>> GetRosterWithStats(int teamId, DateTime weekStart, ScoringWeights w, CancellationToken ct)
    {
        // OPTIMIZATION: Use projection to avoid materializing full Player entities
        var rosterData = await _context.Contracts
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

        var todayStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var weekEnd = weekStart.AddDays(7);
        var sDateStr = weekStart.ToString("yyyy-MM-dd");
        var eDateStr = weekEnd.ToString("yyyy-MM-dd");

        var playerIds = rosterData.Select(x => x.PlayerId).ToList();

        // Optimized dictionary fetch for Today and Weekly stats
        var dailyLogs = new Dictionary<int, double>();
        var weeklyLogs = new Dictionary<int, double>();

        if (playerIds.Any())
        {
            // Fetch relevant logs for the whole week
            // SELECT RAW STATS FOR DYNAMIC CALCULATION
            var logs = await _context.PlayerGameLogs
                .Where(l => l.GameDate.CompareTo(sDateStr) >= 0 && l.GameDate.CompareTo(eDateStr) < 0 && playerIds.Contains(l.PlayerId))
                .Select(l => new { 
                    l.PlayerId, 
                    l.GameDate,
                    l.Points,
                    l.Rebounds,
                    l.Assists,
                    l.Steals,
                    l.Blocks,
                    l.Turnovers
                })
                .ToListAsync(ct);

            // In-Memory Calculation of FPT
            var calculatedLogs = logs.Select(l => new 
            {
                l.PlayerId,
                l.GameDate,
                FantasyPoints = (l.Points * w.P) + (l.Rebounds * w.R) + (l.Assists * w.A) +
                                (l.Steals * w.S) + (l.Blocks * w.B) + (l.Turnovers * w.T)
            }).ToList();

            dailyLogs = calculatedLogs
                .Where(l => l.GameDate == todayStr)
                .ToDictionary(l => l.PlayerId, l => l.FantasyPoints);
            
            weeklyLogs = calculatedLogs
                .GroupBy(l => l.PlayerId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.FantasyPoints));
        }

        return rosterData.Select(c => new MatchPlayerDto
        {
            Id = c.PlayerId,
            Name = $"{c.FirstName.Substring(0, 1)}. {c.LastName}",
            Position = c.Position,
            NbaTeam = c.NbaTeam,
            TodayScore = dailyLogs.GetValueOrDefault(c.PlayerId, 0),
            WeeklyScore = weeklyLogs.GetValueOrDefault(c.PlayerId, 0),
            Status = "Active"
        }).ToList();
    }
}
