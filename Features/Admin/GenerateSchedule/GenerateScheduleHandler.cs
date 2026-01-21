using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.GenerateSchedule;

public class GenerateScheduleHandler : IRequestHandler<GenerateScheduleCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;
    private readonly ScheduleService _scheduleService;

    public GenerateScheduleHandler(ApplicationDbContext context, ScheduleService scheduleService)
    {
        _context = context;
        _scheduleService = scheduleService;
    }

    public async Task<Result<string>> Handle(GenerateScheduleCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var isAdmin = await _context.Teams
            .AnyAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId && t.IsAdmin, cancellationToken);
        if (!isAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Generate Schedule
        // 2. Generate Schedule
        var league = await _context.Leagues.FindAsync(new object[] { request.LeagueId }, cancellationToken);
        if (league == null) return Result<string>.Failure(ErrorCodes.LEAGUE_NOT_FOUND);

        // Update Playoff Teams Settings
        var settings = await _context.LeagueSettings
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        if (settings != null)
        {
            settings.PlayoffTeams = request.PlayoffTeams;
        }

        // Always start from Today (or league setting) as we are wiping everything
        league.SeasonStartDate = DateTime.UtcNow.Date;

        await _context.SaveChangesAsync(cancellationToken);

        await _scheduleService.GenerateCalendarAsync(request.LeagueId, request.Mode);
        
        // Service saves its own changes


        return Result<string>.Success(SuccessCodes.SCHEDULE_GENERATED);
    }
}
