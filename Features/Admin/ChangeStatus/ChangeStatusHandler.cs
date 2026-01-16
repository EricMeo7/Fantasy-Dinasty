using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.ChangeStatus;

public class ChangeStatusHandler : IRequestHandler<ChangeStatusCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;

    public ChangeStatusHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> Handle(ChangeStatusCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_ADMIN_ONLY);

        // 2. Update Status
        var league = await _context.Leagues.FindAsync(new object[] { request.LeagueId }, cancellationToken);
        if (league == null) return Result<string>.Failure(ErrorCodes.LEAGUE_NOT_FOUND);

        league.Status = request.NewState;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<string>.Success("Stato aggiornato con successo.");
    }
}
