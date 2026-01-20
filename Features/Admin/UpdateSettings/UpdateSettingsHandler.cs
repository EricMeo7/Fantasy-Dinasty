using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.UpdateSettings;

public class UpdateSettingsHandler : IRequestHandler<UpdateSettingsCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;

    public UpdateSettingsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> Handle(UpdateSettingsCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Update Settings
        var league = await _context.Leagues.FindAsync(new object[] { request.LeagueId }, cancellationToken);
        if (league == null) return Result<string>.Failure(ErrorCodes.LEAGUE_NOT_FOUND);
        
        var settings = await _context.LeagueSettings.FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        if (settings == null)
        {
            settings = new LeagueSettings { LeagueId = request.LeagueId, League = league };
            _context.LeagueSettings.Add(settings);
        }

        var input = request.Settings;
        settings.SalaryCap = input.SalaryCap;
        settings.SalaryFloor = input.SalaryFloor;
        settings.MinBidAmount = input.MinBidAmount;
        settings.PointWeight = input.PointWeight;
        settings.ReboundWeight = input.ReboundWeight;
        settings.AssistWeight = input.AssistWeight;
        settings.StealWeight = input.StealWeight;
        settings.BlockWeight = input.BlockWeight;
        settings.TurnoverWeight = input.TurnoverWeight;

        // Advanced Scoring
        settings.FgmWeight = input.FgmWeight;
        settings.FgaWeight = input.FgaWeight;
        settings.FtmWeight = input.FtmWeight;
        settings.FtaWeight = input.FtaWeight;
        settings.ThreePmWeight = input.ThreePmWeight;
        settings.ThreePaWeight = input.ThreePaWeight;
        settings.OrebWeight = input.OrebWeight;
        settings.DrebWeight = input.DrebWeight;
        settings.WinWeight = input.WinWeight;
        settings.LossWeight = input.LossWeight;
        
        // Roster Limits
        settings.RoleLimitGuards = input.RoleLimitGuards;
        settings.RoleLimitForwards = input.RoleLimitForwards;
        settings.RoleLimitCenters = input.RoleLimitCenters;

        // RosterSlots assignments removed simplifies model

        // 3. Sync League table (Legacy)
        if (league != null)
        {
            league.SalaryCap = input.SalaryCap;
            league.MinBidAmount = input.MinBidAmount;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<string>.Success(SuccessCodes.SETTINGS_UPDATED);
    }
}
