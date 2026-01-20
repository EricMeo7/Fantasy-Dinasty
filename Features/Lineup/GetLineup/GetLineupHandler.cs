using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FantasyBasket.API.Features.Lineup.GetLineup;

public class GetLineupHandler : IRequestHandler<GetLineupQuery, Result<List<DailyLineupDto>>>
{
    private readonly ApplicationDbContext _context;
    private readonly INbaDataService _nbaService;
    private readonly IMemoryCache _cache;

    public GetLineupHandler(ApplicationDbContext context, INbaDataService nbaService, IMemoryCache cache)
    {
        _context = context;
        _nbaService = nbaService;
        _cache = cache;
    }

    public async Task<Result<List<DailyLineupDto>>> Handle(GetLineupQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = $"lineup_{request.LeagueId}_{request.UserId}_{request.TargetTeamId}_{request.Date:yyyyMMdd}";
        if (_cache.TryGetValue(cacheKey, out List<DailyLineupDto>? cachedLineup) && cachedLineup != null)
        {
            return Result<List<DailyLineupDto>>.Success(cachedLineup);
        }

        // 1. Identify Team
        int teamId = 0;
        if (request.TargetTeamId.HasValue)
        {
            teamId = await _context.Teams
                .AsNoTracking()
                .Where(t => t.Id == request.TargetTeamId.Value && t.LeagueId == request.LeagueId)
                .Select(t => t.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }
        else
        {
            teamId = await _context.Teams
                .AsNoTracking()
                .Where(t => t.UserId == request.UserId && t.LeagueId == request.LeagueId)
                .Select(t => t.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (teamId == 0) return Result<List<DailyLineupDto>>.Failure(ErrorCodes.TEAM_NOT_FOUND);

        DateTime startOfDay = request.Date.Date;
        DateTime endOfDay = startOfDay.AddDays(1);

        // 2. Fetch Existing Lineup
        var lineupEntries = await _context.DailyLineups
            .AsNoTracking()
            .Where(d => d.TeamId == teamId && d.Date >= startOfDay && d.Date < endOfDay)
            .Select(d => new {
                d.Id,
                d.PlayerId,
                d.IsStarter,
                d.Slot,
                d.BenchOrder,
                Player = new {
                    d.Player.ExternalId,
                    d.Player.FirstName,
                    d.Player.LastName,
                    d.Player.Position,
                    d.Player.NbaTeam,
                    d.Player.InjuryStatus,
                    d.Player.InjuryBodyPart,
                    d.Player.AvgPoints,
                    d.Player.AvgRebounds,
                    d.Player.AvgAssists,
                    d.Player.FantasyPoints
                }
            })
            .ToListAsync(cancellationToken);

        // 3. Sync with Contracts (Ensure all current players are in lineup)
        var contracts = await _context.Contracts
            .AsNoTracking()
            .Where(c => c.TeamId == teamId)
            .Select(c => new {
                c.PlayerId,
                Player = new {
                    c.Player.NbaTeam,
                    c.Player.Position
                }
            })
            .ToListAsync(cancellationToken);

        var existingPlayerIds = lineupEntries.Select(l => l.PlayerId).ToList();
        var missingContracts = contracts.Where(c => !existingPlayerIds.Contains(c.PlayerId)).ToList();

        if (missingContracts.Any())
        {
            var gamesToday = await _context.NbaGames
                .AsNoTracking()
                .Where(g => g.GameDate >= startOfDay && g.GameDate < endOfDay)
                .Select(g => new { g.HomeTeam, g.AwayTeam, g.GameDate })
                .ToListAsync(cancellationToken);

            var newEntries = new List<DailyLineup>();

            foreach (var c in missingContracts)
            {
                var game = gamesToday.FirstOrDefault(g => g.HomeTeam == c.Player.NbaTeam || g.AwayTeam == c.Player.NbaTeam);
                DateTime entryDate = game != null ? game.GameDate : startOfDay;

                newEntries.Add(new DailyLineup
                {
                    TeamId = teamId,
                    PlayerId = c.PlayerId,
                    Date = entryDate,
                    IsStarter = false,
                    Slot = c.Player.Position,
                    BenchOrder = 0
                });
            }

            if (newEntries.Any())
            {
                _context.DailyLineups.AddRange(newEntries);
                await _context.SaveChangesAsync(cancellationToken);

                // Reload lineupEntries
                lineupEntries = await _context.DailyLineups
                    .AsNoTracking()
                    .Where(d => d.TeamId == teamId && d.Date >= startOfDay && d.Date < endOfDay)
                    .Select(d => new {
                        d.Id,
                        d.PlayerId,
                        d.IsStarter,
                        d.Slot,
                        d.BenchOrder,
                        Player = new {
                            d.Player.ExternalId,
                            d.Player.FirstName,
                            d.Player.LastName,
                            d.Player.Position,
                            d.Player.NbaTeam,
                            d.Player.InjuryStatus,
                            d.Player.InjuryBodyPart,
                            d.Player.AvgPoints,
                            d.Player.AvgRebounds,
                            d.Player.AvgAssists,
                            d.Player.FantasyPoints
                        }
                    })
                    .ToListAsync(cancellationToken);
            }
        }

        // 5. Build DTO
        var gamesMap = await _context.NbaGames
            .AsNoTracking()
            .Where(g => g.GameDate >= startOfDay && g.GameDate < endOfDay)
            .Select(g => new { g.HomeTeam, g.AwayTeam, g.Status, g.GameDate })
            .ToListAsync(cancellationToken);

        var logsToday = await _context.PlayerGameLogs
            .AsNoTracking()
            .Where(l => l.GameDate == startOfDay.ToString("yyyy-MM-dd"))
            .Select(l => new { l.PlayerId, l.FantasyPoints, l.Points, l.Rebounds, l.Assists, l.Steals, l.Blocks, l.Turnovers, l.Minutes })
            .ToListAsync(cancellationToken);

        var result = new List<DailyLineupDto>();

        foreach (var entry in lineupEntries)
        {
            var game = gamesMap.FirstOrDefault(g => g.HomeTeam == entry.Player.NbaTeam || g.AwayTeam == entry.Player.NbaTeam);
            var liveLog = logsToday.FirstOrDefault(l => l.PlayerId == entry.PlayerId);

            string opponent = "";
            string gameTime = "";
            bool hasGame = game != null;

            if (hasGame)
            {
                bool isHome = game!.HomeTeam == entry.Player.NbaTeam;
                opponent = isHome ? game.AwayTeam : "@" + game.HomeTeam;
                gameTime = game.Status;
            }

            result.Add(new DailyLineupDto
            {
                Id = entry.Id,
                PlayerId = entry.PlayerId,
                ExternalId = entry.Player.ExternalId,
                Name = $"{entry.Player.FirstName} {entry.Player.LastName}",
                Position = entry.Player.Position,
                NbaTeam = entry.Player.NbaTeam,
                IsStarter = entry.IsStarter,
                Slot = entry.Slot,
                BenchOrder = entry.BenchOrder,
                HasGame = hasGame,
                Opponent = opponent,
                GameTime = gameTime,
                InjuryStatus = entry.Player.InjuryStatus,
                InjuryBodyPart = entry.Player.InjuryBodyPart,
                RealPoints = liveLog?.FantasyPoints,

                GamePoints = liveLog?.Points,
                GameRebounds = liveLog?.Rebounds,
                GameAssists = liveLog?.Assists,
                GameSteals = liveLog?.Steals,
                GameBlocks = liveLog?.Blocks,
                GameTurnovers = liveLog?.Turnovers,
                GameMinutes = liveLog?.Minutes.ToString() ?? "0",

                AvgPoints = entry.Player.AvgPoints,
                AvgRebounds = entry.Player.AvgRebounds,
                AvgAssists = entry.Player.AvgAssists,
                AvgFantasyPoints = entry.Player.FantasyPoints
            });
        }

        // --- WEEKLY BEST SCORE CALCULATION ---
        // Find the Matchup covering the requested Date to define "The Week"
        // We assume team.LeagueId is set.
        var matchup = await _context.Matchups
            .AsNoTracking()
            .Where(m => m.LeagueId == request.LeagueId && m.StartAt <= startOfDay && m.EndAt > startOfDay)
            .Select(m => new { m.StartAt, m.EndAt })
            .FirstOrDefaultAsync(cancellationToken);
        
        // If we found a Matchup context (we should if schedule exists)
        if (matchup != null && matchup.StartAt.HasValue && matchup.EndAt.HasValue)
        {
            var mStart = matchup.StartAt.Value.ToString("yyyy-MM-dd");
            var mEnd = matchup.EndAt.Value.ToString("yyyy-MM-dd");
            var pIds = result.Select(r => r.PlayerId).ToList();

            // Fetch ALL logs for the week for these players
             var weeklyLogs = await _context.PlayerGameLogs
                .Where(l => pIds.Contains(l.PlayerId) && l.GameDate.CompareTo(mStart) >= 0 && l.GameDate.CompareTo(mEnd) < 0)
                .Select(l => new { l.PlayerId, l.FantasyPoints })
                .ToListAsync(cancellationToken);

            // Group by Player and find Max
            var bestScores = weeklyLogs
                .GroupBy(l => l.PlayerId)
                .ToDictionary(g => g.Key, g => g.Max(x => x.FantasyPoints));

            foreach (var r in result)
            {
                if (bestScores.TryGetValue(r.PlayerId, out double best))
                {
                    r.WeeklyBestScore = best;
                }
            }
        }
        else
        {
             // Fallback: If no matchup found (e.g. offseason), just use today's or null?
             // Keep null.
        }

        var finalResult = result
            .OrderByDescending(r => r.IsStarter)
            .ThenBy(r => r.BenchOrder == 0 ? 99 : r.BenchOrder)
            .ThenByDescending(r => r.AvgFantasyPoints)
            .ToList();

        _cache.Set(cacheKey, finalResult, TimeSpan.FromSeconds(30));

        return Result<List<DailyLineupDto>>.Success(finalResult);
    }
}
