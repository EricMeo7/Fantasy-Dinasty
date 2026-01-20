using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FantasyBasket.API.Features.Roster.GetMyRoster;

public class GetMyRosterHandler : IRequestHandler<GetMyRosterQuery, Result<List<RosterPlayerDto>>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public GetMyRosterHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<Result<List<RosterPlayerDto>>> Handle(GetMyRosterQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = $"my_roster_{request.LeagueId}_{request.UserId}";
        if (_cache.TryGetValue(cacheKey, out List<RosterPlayerDto>? cachedRoster) && cachedRoster != null)
        {
            return Result<List<RosterPlayerDto>>.Success(cachedRoster);
        }

        // 1. Trova il Team dell'utente in QUESTA lega
        var myTeamId = await _context.Teams
            .AsNoTracking()
            .Where(t => t.UserId == request.UserId && t.LeagueId == request.LeagueId)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (myTeamId == 0) return Result<List<RosterPlayerDto>>.Failure(ErrorCodes.NO_TEAM_IN_LEAGUE);

        // 2. Recupera i Contratti + Dati Giocatore (JOIN) + Proiezione Diretta
        var rosterData = await _context.Contracts
            .Where(c => c.TeamId == myTeamId)
            .AsNoTracking()
            .Select(c => new RosterPlayerDto
            {
                Id = c.Player.Id,
                ExternalId = c.Player.ExternalId,
                FirstName = c.Player.FirstName,
                LastName = c.Player.LastName,
                NbaTeam = c.Player.NbaTeam,
                Position = c.Player.Position,
                AvgPoints = c.Player.AvgPoints,
                AvgRebounds = c.Player.AvgRebounds,
                AvgAssists = c.Player.AvgAssists,

                SalaryYear1 = c.SalaryYear1,
                SalaryYear2 = c.SalaryYear2,
                SalaryYear3 = c.SalaryYear3,
                ContractYears = c.ContractYears,

                InjuryStatus = c.Player.InjuryStatus,
                InjuryBodyPart = c.Player.InjuryBodyPart,
                InjuryReturnDate = c.Player.InjuryReturnDate
            })
            .ToListAsync(cancellationToken);

        // OPTIMIZATION: Move sort to client-side to prevent SQL Memory Grant
        var sortedRoster = rosterData.OrderByDescending(x => x.AvgPoints).ToList();

        _cache.Set(cacheKey, sortedRoster, TimeSpan.FromSeconds(120));

        return Result<List<RosterPlayerDto>>.Success(sortedRoster);
    }
}
