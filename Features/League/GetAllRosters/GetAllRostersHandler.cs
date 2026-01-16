using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.GetAllRosters;

public class GetAllRostersHandler : IRequestHandler<GetAllRostersQuery, List<TeamRosterDto>>
{
    private readonly ApplicationDbContext _context;

    public GetAllRostersHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<TeamRosterDto>> Handle(GetAllRostersQuery request, CancellationToken cancellationToken)
    {
        var teamsData = await _context.Teams
            .Where(t => t.LeagueId == request.LeagueId)
            .AsNoTracking()
            .Select(t => new
            {
                t.Id,
                t.UserId,
                t.Name,
                OwnerName = t.User.GeneralManagerName ?? t.User.UserName,
                Roster = t.Roster.Select(c => new 
                {
                   c.Player.Id,
                   c.Player.FirstName,
                   c.Player.LastName,
                   c.Player.ExternalId,
                   c.Player.Position,
                   c.Player.NbaTeam,
                   c.Player.AvgPoints,
                   c.SalaryYear1,
                   c.SalaryYear2,
                   c.SalaryYear3,
                   c.ContractYears,
                   c.Player.InjuryStatus,
                   c.Player.InjuryBodyPart
                }).ToList() // Removed OrderByDescending from SQL projection
            })
            .ToListAsync(cancellationToken);

        return teamsData.Select(t => new TeamRosterDto
        {
            Id = t.Id,
            UserId = t.UserId,
            TeamName = t.Name,
            OwnerName = t.OwnerName,
            Players = t.Roster.Select(c => new PlayerRosterDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                ExternalId = c.ExternalId,
                Position = c.Position,
                NbaTeam = c.NbaTeam,
                AvgPoints = c.AvgPoints,
                SalaryYear1 = (double)c.SalaryYear1,
                SalaryYear2 = (double)c.SalaryYear2,
                SalaryYear3 = (double)c.SalaryYear3,
                ContractYears = c.ContractYears,
                InjuryStatus = c.InjuryStatus,
                InjuryBodyPart = c.InjuryBodyPart
            })
            .OrderByDescending(p => p.SalaryYear1) // Client-side sort
            .ToList()
        }).ToList();
    }
}
