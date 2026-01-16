using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Roster.GetMyRoster;

public class GetMyRosterHandler : IRequestHandler<GetMyRosterQuery, Result<List<RosterPlayerDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetMyRosterHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<RosterPlayerDto>>> Handle(GetMyRosterQuery request, CancellationToken cancellationToken)
    {
        // 1. Trova il Team dell'utente in QUESTA lega
        var myTeamId = await _context.Teams
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

        return Result<List<RosterPlayerDto>>.Success(sortedRoster);
    }
}
