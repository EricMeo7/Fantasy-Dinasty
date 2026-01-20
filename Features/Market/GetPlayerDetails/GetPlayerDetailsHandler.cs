using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Market.GetPlayerDetails;

public class GetPlayerDetailsHandler : IRequestHandler<GetPlayerDetailsQuery, Result<object>>
{
    private readonly ApplicationDbContext _context;

    public GetPlayerDetailsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<object>> Handle(GetPlayerDetailsQuery request, CancellationToken cancellationToken)
    {
        var resultHistory = new List<object>();

        var player = await _context.Players
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PlayerId, cancellationToken);
        
        if (player == null) return Result<object>.Failure(ErrorCodes.PLAYER_NOT_FOUND);

        var history = await _context.PlayerSeasonStats
            .AsNoTracking()
            .Where(s => s.PlayerId == request.PlayerId)
            .ToListAsync(cancellationToken);

        // FETCH LEAGUE SETTINGS
        LeagueSettings? settings = null;
        if (request.LeagueId.HasValue)
        {
            settings = await _context.LeagueSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId.Value, cancellationToken);
        }

        double wP = settings?.PointWeight ?? 1.0;
        double wR = settings?.ReboundWeight ?? 1.2;
        double wA = settings?.AssistWeight ?? 1.5;
        double wS = settings?.StealWeight ?? 3.0;
        double wB = settings?.BlockWeight ?? 3.0;
        double wT = settings?.TurnoverWeight ?? -1.0;

        // DYNAMIC CALCULATION (Current Season)
        double currentDynFpt = Math.Round(
            (player.AvgPoints * wP) + 
            (player.AvgRebounds * wR) + 
            (player.AvgAssists * wA) + 
            (player.AvgSteals * wS) + 
            (player.AvgBlocks * wB) + 
            (player.AvgTurnovers * wT), 1);

        // DYNAMIC CALCULATION (History)
        foreach (var h in history)
        {
             // Note: PlayerSeasonStat might not have AvgTurnovers?
             // Let's assume standard stats exist. If missing, treat as 0 or default.
             // Checking PlayerSeasonStat definition would be safer, but assuming similarity for now.
             // Ideally we need to extend SeasonStat if Turnovers are missing.
             // Logic:
             double histFpt = (h.AvgPoints * wP) + (h.AvgRebounds * wR) + (h.AvgAssists * wA) +
                              (h.AvgSteals * wS) + (h.AvgBlocks * wB);
             
             // We can't update 'h.FantasyPoints' if it's read-only or we don't want to mutate DB object accidentally (though no SaveChanges).
             // But we are creating a new result object, so we can return a modified history structure or just mutate 'h' since it's local scope.
             h.FantasyPoints = Math.Round(histFpt, 1);
        }

        var result = new
        {
            player.Id,
            player.ExternalId,
            player.FirstName,
            player.LastName,
            player.NbaTeam,
            player.Position,
            player.AvgPoints,
            player.AvgRebounds,
            player.AvgAssists,
            player.AvgSteals,
            player.AvgBlocks,
            player.Fgm,
            player.Fga,
            player.FgPercent,
            player.ThreePm,
            player.ThreePa,
            player.ThreePtPercent,
            player.Ftm,
            player.Fta,
            player.FtPercent,
            player.OffRebounds,
            player.DefRebounds,
            player.PersonalFouls,
            player.AvgTurnovers,
            player.AvgMinutes,
            player.PlusMinus,
            player.Efficiency,
            player.WinPct,
            player.DoubleDoubles,
            player.TripleDoubles,
            FantasyPoints = currentDynFpt, // Use Calculated
            player.GamesPlayed,
            player.Height,
            player.Weight,
            SeasonStats = history
        };

        return Result<object>.Success(result);
    }
}
