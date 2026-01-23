using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.GetStatus;

public class GetStatusHandler : IRequestHandler<GetStatusQuery, Result<LeagueState>>
{
    private readonly ApplicationDbContext _context;

    public GetStatusHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<LeagueState>> Handle(GetStatusQuery request, CancellationToken cancellationToken)
    {
        var status = await _context.Leagues
            .Where(l => l.Id == request.LeagueId)
            .Select(l => l.Status)
            .FirstOrDefaultAsync(cancellationToken);

        // If not found, default to DraftMode? Or handle error? 
        // Original code returned DraftMode on null.
        if (status == 0 && !await _context.Leagues.AnyAsync(l => l.Id == request.LeagueId, cancellationToken)) 
        {
             return Result<LeagueState>.Success(LeagueState.DraftMode);
        }
        
        return Result<LeagueState>.Success(status);
    }
}
