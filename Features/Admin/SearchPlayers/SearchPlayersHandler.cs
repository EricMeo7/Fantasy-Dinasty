using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.SearchPlayers;

public class SearchPlayersHandler : IRequestHandler<SearchPlayersQuery, Result<List<AdminPlayerSearchDto>>>
{
    private readonly ApplicationDbContext _context;

    public SearchPlayersHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<AdminPlayerSearchDto>>> Handle(SearchPlayersQuery request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<List<AdminPlayerSearchDto>>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Search
        var players = await _context.Players
            .Where(p => p.LastName.ToLower().Contains(request.Query.ToLower()) || p.FirstName.ToLower().Contains(request.Query.ToLower()))
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .Take(20)
            .Select(p => new AdminPlayerSearchDto
            {
                Id = p.Id,
                FirstName = p.FirstName,
                LastName = p.LastName,
                NbaTeam = p.NbaTeam,
                CurrentOwner = _context.Contracts
                    .Where(c => c.PlayerId == p.Id && c.Team.LeagueId == request.LeagueId)
                    .Select(c => c.Team.Name)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return Result<List<AdminPlayerSearchDto>>.Success(players);
    }
}
