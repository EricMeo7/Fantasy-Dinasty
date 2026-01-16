using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FantasyBasket.API.Features.Lineup.UpdateLineup;

public class UpdateLineupHandler : IRequestHandler<UpdateLineupCommand, Result<bool>>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UpdateLineupHandler> _logger;

    public UpdateLineupHandler(ApplicationDbContext context, ILogger<UpdateLineupHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(UpdateLineupCommand request, CancellationToken cancellationToken)
    {
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.UserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null) return Result<bool>.Failure(ErrorCodes.TEAM_NOT_FOUND);

        // CRITICAL: Lock validation
        var league = await _context.Leagues.FindAsync(new object[] { request.LeagueId }, cancellationToken);
        if (league != null)
        {
            DateTime dayStart = request.Date.Date;
            DateTime dayEnd = dayStart.AddDays(1);
            
            var gamesToday = await _context.NbaGames
                .Where(g => g.GameDate >= dayStart && g.GameDate < dayEnd)
                .ToListAsync(cancellationToken);

            if (gamesToday.Any())
            {
                 // Calculate Lock Time based on Earliest Game
                 var lockTime = gamesToday
                    .Select(g => Services.NbaDataService.ParseEstToUtc(g.GameTime, g.GameDate))
                    .OrderBy(t => t)
                    .First();

                if (DateTime.UtcNow > lockTime)
                {
                     _logger.LogWarning($"Lineup Locked. UTC: {DateTime.UtcNow}, LockTime: {lockTime}");
                    return Result<bool>.Failure(ErrorCodes.LINEUP_LOCKED);
                }
            }
            
            // Note: Removed the "past date" fallback lock for now if no games are found, 
            // to allow testing or late entry if data is missing.
            // But if dayStart is strictly in past and NO games found, maybe lock?
            // User wants lenient behavior. So if no games found, allow edit?
            // Let's keep it strict ONLY if games exist.
        }

        DateTime startOfDay = request.Date.Date;
        DateTime endOfDay = startOfDay.AddDays(1);

        var lineups = await _context.DailyLineups
            .Where(d => d.TeamId == team.Id && d.Date >= startOfDay && d.Date < endOfDay)
            .ToListAsync(cancellationToken);

        if (!lineups.Any()) return Result<bool>.Failure(ErrorCodes.LINEUP_NOT_FOUND);

        // Create lookup for starters: PlayerId -> Slot
        var starterMap = request.StarterSlots.ToDictionary(k => k.Value, v => v.Key);

        foreach (var l in lineups)
        {
            if (starterMap.TryGetValue(l.PlayerId, out var slot))
            {
                l.IsStarter = true;
                l.Slot = slot; // Persist the chosen Slot
                l.BenchOrder = 0;
            }
            else
            {
                l.IsStarter = false;
                // Preserve original position for Bench or set to "BN"?
                // Let's reset slot to empty or keep "BN"?
                // Ideally bench players don't have a specific slot, but we can store their primary pos or "BN".
                // Model default is string.Empty. 
                // Let's set it to "BN" to be clear.
                l.Slot = "BN"; 
                
                int order = request.Bench.IndexOf(l.PlayerId);
                l.BenchOrder = order != -1 ? order + 1 : 99;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }
}
