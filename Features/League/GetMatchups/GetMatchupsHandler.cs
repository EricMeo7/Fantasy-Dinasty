using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FantasyBasket.API.Features.League.GetMatchups;

public class GetMatchupsHandler : IRequestHandler<GetMatchupsQuery, Result<List<MatchupDto>>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public GetMatchupsHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<Result<List<MatchupDto>>> Handle(GetMatchupsQuery request, CancellationToken cancellationToken)
    {
        string cacheKey = $"matchups_{request.LeagueId}";
        if (_cache.TryGetValue(cacheKey, out List<MatchupDto>? cachedMatchups) && cachedMatchups != null)
        {
            return Result<List<MatchupDto>>.Success(cachedMatchups);
        }

        var seasonStartDate = await _context.Leagues
            .AsNoTracking()
            .Where(l => l.Id == request.LeagueId)
            .Select(l => l.SeasonStartDate)
            .FirstOrDefaultAsync(cancellationToken) ?? DateTime.UtcNow.Date;

        // 1. Recupera tutti i match (Proiezione)
        var matches = await _context.Matchups
            .AsNoTracking()
            .Where(m => m.LeagueId == request.LeagueId)
            .OrderBy(m => m.WeekNumber)
            .Select(m => new {
                m.Id,
                m.WeekNumber,
                m.IsPlayed,
                m.HomeTeamId,
                m.AwayTeamId,
                m.HomeScore,
                m.AwayScore,
                m.StartAt,
                m.EndAt,
                m.HomeTeamPlaceholder,
                m.AwayTeamPlaceholder
            })
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

        _cache.Set(cacheKey, result, TimeSpan.FromSeconds(60));

        return Result<List<MatchupDto>>.Success(result);
    }
}
