using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using FantasyBasket.API.Services;
using FantasyBasket.API.Models;

namespace FantasyBasket.API.Features.League.GetAllRosters;

public class GetAllRostersHandler : IRequestHandler<GetAllRostersQuery, List<TeamRosterDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public GetAllRostersHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<List<TeamRosterDto>> Handle(GetAllRostersQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = $"all_rosters_{request.LeagueId}";
        if (_cache.TryGetValue(cacheKey, out List<TeamRosterDto>? cachedRosters) && cachedRosters != null)
        {
            return cachedRosters;
        }

        // FETCH SETTINGS
        var settings = await _context.LeagueSettings.AsNoTracking()
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        var leagueSettings = settings ?? new Models.LeagueSettings(); // Default

        var teamsData = await _context.Teams
            .Where(t => t.LeagueId == request.LeagueId)
            .AsNoTracking()
            .Select(t => new
            {
                t.Id,
                t.UserId,
                t.Name,
                OwnerName = t.User.GeneralManagerName ?? t.User.UserName ?? "Unknown",
                Roster = t.Roster.Select(c => new 
                {
                   c.Id,
                   c.PlayerId,
                   c.Player.FirstName,
                   c.Player.LastName,
                   c.Player.ExternalId,
                   c.Player.Position,
                   c.Player.NbaTeam,
                   Player = c.Player, // Fetch full player for calculation
                   c.SalaryYear1,
                   c.SalaryYear2,
                   c.SalaryYear3,
                   c.ContractYears,
                   c.Player.InjuryStatus,
                   c.Player.InjuryBodyPart
                }).ToList() 
            })
            .ToListAsync(cancellationToken);

        var result = teamsData.Select(t => new TeamRosterDto
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
                AvgPoints = c.Player.AvgPoints,
                FantasyPoints = FantasyPointCalculator.Calculate(c.Player, leagueSettings),
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

        _cache.Set(cacheKey, result, TimeSpan.FromSeconds(120));
        return result;
    }
}
