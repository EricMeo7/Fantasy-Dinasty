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
        var league = await _context.Leagues.FindAsync(new object[] { request.LeagueId }, cancellationToken);
        if (league == null) return Result<LeagueState>.Success(LeagueState.DraftMode); // Default or error?

        return Result<LeagueState>.Success(league.Status);
    }
}
