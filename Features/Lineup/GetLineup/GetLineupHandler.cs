using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Lineup.GetLineup;

public class GetLineupHandler : IRequestHandler<GetLineupQuery, Result<List<DailyLineupDto>>>
{
    private readonly ApplicationDbContext _context;
    private readonly INbaDataService _nbaService;

    public GetLineupHandler(ApplicationDbContext context, INbaDataService nbaService)
    {
        _context = context;
        _nbaService = nbaService;
    }

    public async Task<Result<List<DailyLineupDto>>> Handle(GetLineupQuery request, CancellationToken cancellationToken)
    {
        // 1. Identify Team
        FantasyBasket.API.Models.Team? team = null;
        if (request.TargetTeamId.HasValue)
        {
            team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == request.TargetTeamId.Value && t.LeagueId == request.LeagueId, cancellationToken);
        }
        else
        {
            team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.UserId && t.LeagueId == request.LeagueId, cancellationToken);
        }

        if (team == null) return Result<List<DailyLineupDto>>.Failure(ErrorCodes.TEAM_NOT_FOUND);

        DateTime startOfDay = request.Date.Date;
        DateTime endOfDay = startOfDay.AddDays(1);

        // 2. Fetch Existing Lineup
        var lineupEntries = await _context.DailyLineups
            .Where(d => d.TeamId == team!.Id && d.Date >= startOfDay && d.Date < endOfDay)
            .Include(d => d.Player)
            .ToListAsync(cancellationToken);

        // 3. Auto-Fill if Empty (Logic migrated from Controller)
        // 3. Sync with Contracts (Ensure all current players are in lineup)
        // This fixes the issue where traded/acquired players don't show up in future lineups
        var contracts = await _context.Contracts
            .Where(c => c.TeamId == team!.Id)
            .Include(c => c.Player)
            .ToListAsync(cancellationToken);

        var existingPlayerIds = lineupEntries.Select(l => l.PlayerId).ToList();
        var missingContracts = contracts.Where(c => !existingPlayerIds.Contains(c.PlayerId)).ToList();

        if (missingContracts.Any())
        {
            var gamesToday = await _context.NbaGames
                .Where(g => g.GameDate >= startOfDay && g.GameDate < endOfDay)
                .ToListAsync(cancellationToken);

            var newEntries = new List<DailyLineup>();

            foreach (var c in missingContracts)
            {
                var game = gamesToday.FirstOrDefault(g => g.HomeTeam == c.Player.NbaTeam || g.AwayTeam == c.Player.NbaTeam);
                // If game exists, use game date (redundant if checking only today?), otherwise startOfDay
                DateTime entryDate = game != null ? game.GameDate : startOfDay;

                newEntries.Add(new DailyLineup
                {
                    TeamId = team!.Id,
                    PlayerId = c.PlayerId,
                    Date = entryDate,
                    IsStarter = false, // Default newly acquired players to bench
                    Slot = c.Player.Position,
                    BenchOrder = 0 // Will sort at bottom
                });
            }

            if (newEntries.Any())
            {
                _context.DailyLineups.AddRange(newEntries);
                await _context.SaveChangesAsync(cancellationToken);

                // Reload lineupEntries with the new additions
                lineupEntries = await _context.DailyLineups
                    .Where(d => d.TeamId == team!.Id && d.Date >= startOfDay && d.Date < endOfDay)
                    .Include(d => d.Player)
                    .ToListAsync(cancellationToken);
            }
        }

        // 4. Force Refresh Logic DISABLED to prevent UI Lag
        // We rely on Background Worker for Live Scores.
        // Syncing synchronously here is too risky (stats.nba.com timeouts).
        /*
        var playerIds = lineupEntries.Select(l => l.PlayerId).ToList();
        if (playerIds.Any())
        {
            var logsCheck = await _context.PlayerGameLogs
                .CountAsync(l => l.GameDate == startOfDay.ToString("yyyy-MM-dd") && playerIds.Contains(l.PlayerId), cancellationToken);

            if (logsCheck < playerIds.Count && request.Date.Date <= DateTime.UtcNow.Date)
            {
                await _nbaService.GetFantasyPointsByDate(startOfDay, playerIds);
            }
        }
        */

        // 5. Build DTO
        var gamesMap = await _context.NbaGames
            .Where(g => g.GameDate >= startOfDay && g.GameDate < endOfDay)
            .ToListAsync(cancellationToken);

        var logsToday = await _context.PlayerGameLogs
            .Where(l => l.GameDate == startOfDay.ToString("yyyy-MM-dd"))
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
                Slot = entry.Slot, // Map the slot
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
            .FirstOrDefaultAsync(m => m.LeagueId == team!.LeagueId && m.StartAt <= startOfDay && m.EndAt > startOfDay, cancellationToken);
        
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

        return Result<List<DailyLineupDto>>.Success(result
            .OrderByDescending(r => r.IsStarter)
            .ThenBy(r => r.BenchOrder == 0 ? 99 : r.BenchOrder)
            .ThenByDescending(r => r.AvgFantasyPoints)
            .ToList());
    }
}
