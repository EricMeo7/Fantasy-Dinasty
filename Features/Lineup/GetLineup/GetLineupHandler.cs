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

        // Fetch League Settings for Scoring
        var settings = await _context.LeagueSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
            
        // Default Settings if missing (Fallback)
        double wP = settings?.PointWeight ?? 1.0;
        double wR = settings?.ReboundWeight ?? 1.2;
        double wA = settings?.AssistWeight ?? 1.5;
        double wS = settings?.StealWeight ?? 3.0;
        double wB = settings?.BlockWeight ?? 3.0;
        double wT = settings?.TurnoverWeight ?? -1.0;
        
        // Advanced
        double wFgm = settings?.FgmWeight ?? 0.0;
        double wFga = settings?.FgaWeight ?? 0.0;
        double wFtm = settings?.FtmWeight ?? 0.0;
        double wFta = settings?.FtaWeight ?? 0.0;
        double w3pm = settings?.ThreePmWeight ?? 0.0;
        double w3pa = settings?.ThreePaWeight ?? 0.0;
        double wOr  = settings?.OrebWeight ?? 0.0;
        double wDr  = settings?.DrebWeight ?? 0.0;
        double wWin = settings?.WinWeight ?? 0.0;
        double wLoss = settings?.LossWeight ?? 0.0;


        var logsToday = await _context.PlayerGameLogs
            .AsNoTracking()
            .Where(l => l.GameDate == startOfDay.ToString("yyyy-MM-dd"))
            .Select(l => new { l.PlayerId, l.FantasyPoints, l.Points, l.Rebounds, l.Assists, l.Steals, l.Blocks, l.Turnovers, l.Minutes, l.Fgm, l.Fga, l.ThreePm, l.ThreePa, l.Ftm, l.Fta, l.OffRebounds, l.DefRebounds, l.Won })
            .ToListAsync(cancellationToken);

        var dtos = new List<DailyLineupDto>();

        foreach (var entry in lineupEntries)
        {
            var game = gamesMap.FirstOrDefault(g => g.HomeTeam == entry.Player.NbaTeam || g.AwayTeam == entry.Player.NbaTeam);
            var liveLog = logsToday.FirstOrDefault(l => l.PlayerId == entry.PlayerId);

            var dto = new DailyLineupDto
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
                AvgPoints = entry.Player.AvgPoints,
                AvgRebounds = entry.Player.AvgRebounds,
                AvgAssists = entry.Player.AvgAssists,
                AvgFantasyPoints = entry.Player.FantasyPoints,
                InjuryStatus = entry.Player.InjuryStatus,
                InjuryBodyPart = entry.Player.InjuryBodyPart
            };

            // Check Live Game / Log
            if (liveLog != null)
            {
                // We assume liveLog.FantasyPoints is stored correctly, 
                // BUT for exact correctness relative to Presentation we should recalculate or assume stored is correct.
                // Stored FP is usually pre-calculated by NbaDataService. 
                // However, NbaDataService might not know specific league weights if it's a global service?
                // Actually, NbaDataService usually calculates based on standard or specific logic.
                // Let's rely on Stored FP for the "Total", but calculate the breakdowns manually for display.
                
                dto.RealPoints = liveLog.FantasyPoints;

                dto.GamePoints = liveLog.Points;
                dto.GameRebounds = liveLog.Rebounds;
                dto.GameAssists = liveLog.Assists;
                dto.GameSteals = liveLog.Steals;
                dto.GameBlocks = liveLog.Blocks;
                dto.GameTurnovers = liveLog.Turnovers;
                dto.GameMinutes = liveLog.Minutes;
                
                dto.GameFgm = liveLog.Fgm;
                dto.GameFga = liveLog.Fga;
                dto.GameThreePm = liveLog.ThreePm;
                dto.GameThreePa = liveLog.ThreePa;
                dto.GameFtm = liveLog.Ftm;
                dto.GameFta = liveLog.Fta;
                
                dto.GameOffRebounds = liveLog.OffRebounds;
                dto.GameDefRebounds = liveLog.DefRebounds;

                // Calculate FP Contributions
                dto.GamePointsFp = liveLog.Points * wP;
                dto.GameReboundsFp = liveLog.Rebounds * wR;
                dto.GameAssistsFp = liveLog.Assists * wA;
                dto.GameStealsFp = liveLog.Steals * wS;
                dto.GameBlocksFp = liveLog.Blocks * wB;
                dto.GameTurnoversFp = liveLog.Turnovers * wT;
                
                dto.GameFgmFp = liveLog.Fgm * wFgm;
                dto.GameFgaFp = liveLog.Fga * wFga;
                dto.GameThreePmFp = liveLog.ThreePm * w3pm;
                dto.GameThreePaFp = liveLog.ThreePa * w3pa;
                dto.GameFtmFp = liveLog.Ftm * wFtm;
                dto.GameFtaFp = liveLog.Fta * wFta;
                
                dto.GameOffReboundsFp = liveLog.OffRebounds * wOr;
                dto.GameDefReboundsFp = liveLog.DefRebounds * wDr;
                
                // Win/Loss Calculation
                if (liveLog.Won) 
                {
                    dto.GameWinFp = wWin;
                }
                else
                {
                    dto.GameLossFp = wLoss;
                }
                
                // Calculate Real FP (Dynamic) - Summing all parts
                // Note: Rebounds vs Oreb/Dreb logic. 
                // If wR > 0 and wOr/wDr == 0, use Total Rebounds.
                // If wOr/wDr > 0 and wR == 0, use Split.
                // If BOTH are present, sum BOTH (Double count? Usually commissioner chooses one).
                // Let's assume additives for now as per simple summation.
                
                double totalFp = (dto.GamePointsFp ?? 0) + 
                                 (dto.GameReboundsFp ?? 0) + 
                                 (dto.GameAssistsFp ?? 0) + 
                                 (dto.GameStealsFp ?? 0) + 
                                 (dto.GameBlocksFp ?? 0) + 
                                 (dto.GameTurnoversFp ?? 0) +
                                 (dto.GameFgmFp ?? 0) +
                                 (dto.GameFgaFp ?? 0) +
                                 (dto.GameThreePmFp ?? 0) +
                                 (dto.GameThreePaFp ?? 0) +
                                 (dto.GameFtmFp ?? 0) +
                                 (dto.GameFtaFp ?? 0) +
                                 (dto.GameOffReboundsFp ?? 0) +
                                 (dto.GameDefReboundsFp ?? 0) +
                                 (dto.GameWinFp ?? 0) +
                                 (dto.GameLossFp ?? 0);
                                 
                dto.RealPoints = Math.Round(totalFp, 1);
            }

            if (game != null)
            {
                dto.HasGame = true;
                dto.Opponent = game.HomeTeam == entry.Player.NbaTeam ? game.AwayTeam : game.HomeTeam;
                dto.GameTime = game.Status; 
            }
            
            dtos.Add(dto);
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
            var pIds = dtos.Select(r => r.PlayerId).ToList();

            // Fetch ALL logs for the week for these players
             var weeklyLogs = await _context.PlayerGameLogs
                .Where(l => pIds.Contains(l.PlayerId) && l.GameDate.CompareTo(mStart) >= 0 && l.GameDate.CompareTo(mEnd) < 0)
                .Select(l => new { l.PlayerId, l.FantasyPoints })
                .ToListAsync(cancellationToken);

            // Group by Player and find Max
            var bestScores = weeklyLogs
                .GroupBy(l => l.PlayerId)
                .ToDictionary(g => g.Key, g => g.Max(x => x.FantasyPoints));

            foreach (var dto in dtos)
            {
                if (bestScores.TryGetValue(dto.PlayerId, out double best))
                {
                    dto.WeeklyBestScore = best;
                }
            }
        }
        else
        {
             // Fallback: If no matchup found (e.g. offseason), just use today's or null?
             // Keep null.
        }

        var finalResult = dtos
            .OrderByDescending(r => r.IsStarter)
            .ThenBy(r => r.BenchOrder == 0 ? 99 : r.BenchOrder)
            .ThenByDescending(r => r.AvgFantasyPoints)
            .ToList();

        _cache.Set(cacheKey, finalResult, TimeSpan.FromSeconds(30));

        return Result<List<DailyLineupDto>>.Success(finalResult);
    }
}
