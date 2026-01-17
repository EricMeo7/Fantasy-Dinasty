using MediatR;
using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.LeaveLeague;

public record LeaveLeagueCommand(int LeagueId, string UserId) : IRequest<Result<bool>>;

public class LeaveLeagueHandler : IRequestHandler<LeaveLeagueCommand, Result<bool>>
{
    private readonly ApplicationDbContext _context;

    public LeaveLeagueHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(LeaveLeagueCommand request, CancellationToken cancellationToken)
    {
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.LeagueId == request.LeagueId && t.UserId == request.UserId, cancellationToken);

        if (team == null)
            return Result<bool>.Failure("Non sei iscritto a questa lega o la lega non esiste.");

        // Check if admin is leaving? (Optional, skipping for now as per minimal viable request)
        
        _context.Teams.Remove(team);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
