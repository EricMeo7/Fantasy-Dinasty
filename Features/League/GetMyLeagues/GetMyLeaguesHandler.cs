using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.GetMyLeagues;

public class GetMyLeaguesHandler : IRequestHandler<GetMyLeaguesQuery, List<LeagueListDto>>
{
    private readonly ApplicationDbContext _context;

    public GetMyLeaguesHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LeagueListDto>> Handle(GetMyLeaguesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Teams
            .Where(t => t.UserId == request.UserId)
            .Include(t => t.League)
            .Select(t => new LeagueListDto
            {
                LeagueId = t.League.Id,
                LeagueName = t.League.Name,
                MyTeamName = t.Name,
                IsAdmin = t.IsAdmin
            })
            .ToListAsync(cancellationToken);
    }
}
