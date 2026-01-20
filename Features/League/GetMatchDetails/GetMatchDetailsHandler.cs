using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

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
            .Select(l => new { l.SeasonStartDate })
            .FirstOrDefaultAsync(ct);
        
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

        response.HomePlayers = await GetRosterWithStats(homeTeam.Id, weekStart, weights, ct);
        response.AwayPlayers = await GetRosterWithStats(awayTeam.Id, weekStart, weights, ct);

        return Result<MatchDetailsResponseDto>.Success(response);
    }

    private class ScoringWeights { public double P; public double R; public double A; public double S; public double B; public double T; }

    private async Task<List<MatchPlayerDto>> GetRosterWithStats(int teamId, DateTime weekStart, ScoringWeights w, CancellationToken ct)
    {
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

        var todayStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var weekEnd = weekStart.AddDays(7);
        var sDateStr = weekStart.ToString("yyyy-MM-dd");
        var eDateStr = weekEnd.ToString("yyyy-MM-dd");

        var playerIds = rosterData.Select(x => x.PlayerId).ToList();

        var dailyLogs = new Dictionary<int, double>();
        var weeklyLogs = new Dictionary<int, double>();

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
                    l.Turnovers
                })
                .ToListAsync(ct);

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
            Name = $"{(c.FirstName.Length > 0 ? c.FirstName.Substring(0, 1) : "")}. {c.LastName}",
            Position = c.Position,
            NbaTeam = c.NbaTeam,
            TodayScore = dailyLogs.GetValueOrDefault(c.PlayerId, 0),
            WeeklyScore = weeklyLogs.GetValueOrDefault(c.PlayerId, 0),
            Status = "Active"
        }).ToList();
    }
}
