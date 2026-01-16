using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.GetMatchups;

public class GetMatchupsHandler : IRequestHandler<GetMatchupsQuery, Result<List<MatchupDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetMatchupsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<MatchupDto>>> Handle(GetMatchupsQuery request, CancellationToken cancellationToken)
    {
        var seasonStartDate = await _context.Leagues
            .Where(l => l.Id == request.LeagueId)
            .Select(l => l.SeasonStartDate)
            .FirstOrDefaultAsync(cancellationToken) ?? DateTime.UtcNow.Date;

        // 1. Recupera tutti i match
        var matches = await _context.Matchups
            .Where(m => m.LeagueId == request.LeagueId)
            .OrderBy(m => m.WeekNumber)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // 2. Recupera tutte le squadre (Cacheabile, ma veloce)
        // 2. Recupera tutte le squadre (Cacheabile, ma veloce)
        var teamsList = await _context.Teams
            .Where(t => t.LeagueId == request.LeagueId)
            .Select(t => new { t.UserId, t.Name, t.Id })
            .ToListAsync(cancellationToken);
            
        var teams = teamsList.ToDictionary(t => t.UserId, t => t, StringComparer.OrdinalIgnoreCase);

        var result = new List<MatchupDto>();

        // Logica BYE: Dobbiamo sapere chi gioca in ogni settimana per capire chi riposa
        var matchesByWeek = matches.GroupBy(m => m.WeekNumber).OrderBy(g => g.Key);

        foreach (var weekGroup in matchesByWeek)
        {
            int weekNum = weekGroup.Key;
            
            // Try to get dates from the first match (assuming week matches share the same slot)
            var referenceMatch = weekGroup.FirstOrDefault();
            DateTime wStart;
            DateTime wEnd;

            if (referenceMatch != null && referenceMatch.StartAt.HasValue && referenceMatch.EndAt.HasValue)
            {
                wStart = referenceMatch.StartAt.Value;
                // DB stores EndAt as the boundary (start of next slot), so subtract 1 tick/day for inclusive display?
                // Visual formatting usually expects the LAST day of the week.
                // If Start=Mon, End=NextMon. Display should be Mon-Sun.
                wEnd = referenceMatch.EndAt.Value.AddDays(-1); 
            }
            else
            {
                // Fallback Legacy
                wStart = seasonStartDate.AddDays((weekNum - 1) * 7);
                wEnd = wStart.AddDays(6);
            }
            
            var playingTeamIds = new HashSet<string>();

            // Match Reali
            foreach (var m in weekGroup)
            {
                string homeName = "TBD";
                int homeId = 0;
                
                if (!string.IsNullOrEmpty(m.HomeTeamId) && teams.ContainsKey(m.HomeTeamId))
                {
                    homeName = teams[m.HomeTeamId].Name;
                    homeId = teams[m.HomeTeamId].Id;
                }
                else if (!string.IsNullOrEmpty(m.HomeTeamPlaceholder))
                {
                    homeName = m.HomeTeamPlaceholder;
                }

                string awayName = "TBD";
                int awayId = 0;

                if (!string.IsNullOrEmpty(m.AwayTeamId) && teams.ContainsKey(m.AwayTeamId))
                {
                    awayName = teams[m.AwayTeamId].Name;
                    awayId = teams[m.AwayTeamId].Id;
                }
                else if (!string.IsNullOrEmpty(m.AwayTeamPlaceholder))
                {
                    awayName = m.AwayTeamPlaceholder;
                }

                result.Add(new MatchupDto
                {
                    Id = m.Id,
                    WeekNumber = m.WeekNumber,
                    IsPlayed = m.IsPlayed,
                    HomeTeam = homeName,
                    AwayTeam = awayName,
                    HomeScore = m.HomeScore,
                    AwayScore = m.AwayScore,
                    HomeTeamId = homeId,
                    AwayTeamId = awayId,
                    IsBye = false,
                    WeekStart = wStart,
                    WeekEnd = wEnd
                });

                if (!string.IsNullOrEmpty(m.HomeTeamId)) playingTeamIds.Add(m.HomeTeamId);
                if (!string.IsNullOrEmpty(m.AwayTeamId)) playingTeamIds.Add(m.AwayTeamId);
            }

            // Bye Teams (Riposo)
            foreach (var team in teams)
            {
                if (!playingTeamIds.Contains(team.Key))
                {
                    result.Add(new MatchupDto
                    {
                        Id = -weekNum * 1000 - team.Value.Id, // ID fittizio univoco
                        WeekNumber = weekNum,
                        IsPlayed = false,
                        HomeTeam = team.Value.Name,
                        AwayTeam = "RIPOSO",
                        HomeScore = 0.0,
                        AwayScore = 0.0,
                        HomeTeamId = team.Value.Id,
                        AwayTeamId = 0,
                        IsBye = true,
                        WeekStart = wStart,
                        WeekEnd = wEnd
                    });
                }
            }
        }

        return Result<List<MatchupDto>>.Success(result);
    }
}
