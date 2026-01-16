using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.GetSettings;

public class GetSettingsHandler : IRequestHandler<GetSettingsQuery, Result<LeagueSettings>>
{
    private readonly ApplicationDbContext _context;

    public GetSettingsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<LeagueSettings>> Handle(GetSettingsQuery request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<LeagueSettings>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Fetch Settings
        var settings = await _context.LeagueSettings.FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        if (settings == null)
        {
            settings = new LeagueSettings { LeagueId = request.LeagueId };
        }

        return Result<LeagueSettings>.Success(settings);
    }
}
