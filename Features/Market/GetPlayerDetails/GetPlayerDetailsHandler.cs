using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
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
            .OrderBy(p => p.Id)
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
            settings = await _context.LeagueSettings.AsNoTracking()
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(s => s.LeagueId == (request.LeagueId ?? 0), cancellationToken);
        }

        // DYNAMIC CALCULATION (Current Season)
        double fpts = FantasyPointCalculator.Calculate(player, settings ?? new LeagueSettings());

        double currentDynFpt = fpts; // Alias for compatibility with baseVal logic below

        // DYNAMIC CALCULATION (History)
        foreach (var h in history)
        {
             // Use standardized calculator for history
             h.FantasyPoints = FantasyPointCalculator.Calculate(h, settings ?? new LeagueSettings());
        }

            var contract = await _context.Contracts
                .AsNoTracking()
                .OrderBy(c => c.Id)
                .FirstOrDefaultAsync(c => c.PlayerId == player.Id && c.Team.LeagueId == (request.LeagueId ?? 0), cancellationToken);

            // CALCULATE MIN BID (Standardized Logic)
            // Use previous season stats if available for base valuation
            // Ideally we should inject NbaDataService but to minimize changes here we can check the history list we just fetched
            // Find most recent completed season from history
            var prevStatObj = history.OrderByDescending(s => s.Season).FirstOrDefault(); 
            
            double baseVal = currentDynFpt;
            if (prevStatObj != null)
            {
                // Re-calculate using CURRENT settings to standardise valuation across eras
                 baseVal = FantasyPointCalculator.Calculate(prevStatObj, settings ?? new LeagueSettings());
            }
            double minBid = Math.Max(1, Math.Round(baseVal, MidpointRounding.AwayFromZero));

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
                FantasyPoints = fpts,
                player.GamesPlayed,
                player.Height,
                player.Weight,
                SeasonStats = history,
                
                // ECONOMY
                SalaryYear1 = contract?.SalaryYear1 ?? minBid, // Show Contract Salary or Min Bid if FA
                ContractYears = contract?.ContractYears ?? 0,
                MinBid = minBid
            };

        return Result<object>.Success(result);
    }
}
