using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FantasyBasket.API.Features.League.GetLeagueDetails;

public class GetLeagueDetailsHandler : IRequestHandler<GetLeagueDetailsQuery, Result<LeagueDetailsDto>>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public GetLeagueDetailsHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<Result<LeagueDetailsDto>> Handle(GetLeagueDetailsQuery request, CancellationToken cancellationToken)
    {
        string fullCacheKey = $"league_details_{request.LeagueId}";
        if (_cache.TryGetValue(fullCacheKey, out LeagueDetailsDto? cachedResult) && cachedResult != null)
        {
            return Result<LeagueDetailsDto>.Success(cachedResult);
        }

        var leagueData = await _context.Leagues
            .AsNoTracking()
            .Where(l => l.Id == request.LeagueId)
            .Select(l => new {
                l.Name,
                l.InvitationCode,
                Teams = l.Teams.Select(t => new {
                    t.Id,
                    t.Name,
                    t.UserId,
                    t.IsAdmin,
                    t.Division,
                    ManagerName = t.User.GeneralManagerName ?? t.User.UserName ?? "Unknown"
                }).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (leagueData == null) return Result<LeagueDetailsDto>.Failure(ErrorCodes.LEAGUE_NOT_FOUND);

        // Cache Key for Standings Calculation (Heavy operation)
        string standingCacheKey = $"standings_calc_{request.LeagueId}";
        
        if (!_cache.TryGetValue(standingCacheKey, out List<LeagueStandingDto>? baseStandings) || baseStandings == null)
        {
            // Calculate Standings logic (moved from Controller)
            var matches = await _context.Matchups
                .AsNoTracking()
                .Where(m => m.LeagueId == request.LeagueId && m.IsPlayed)
                .Select(m => new { m.HomeTeamId, m.AwayTeamId, m.HomeScore, m.AwayScore })
                .ToListAsync(cancellationToken);

            baseStandings = new List<LeagueStandingDto>();

            foreach (var team in leagueData.Teams)
            {
                var teamMatches = matches
                    .Where(m => m.HomeTeamId == team.UserId || m.AwayTeamId == team.UserId)
                    .Select(m => new { m.HomeTeamId, m.HomeScore, m.AwayScore })
                    .ToList();
                int wins = 0;
                int losses = 0;
                double points = 0;

                foreach (var m in teamMatches)
                {
                    bool isHome = m.HomeTeamId == team.UserId;
                    double myScore = isHome ? m.HomeScore : m.AwayScore;
                    double oppScore = isHome ? m.AwayScore : m.HomeScore;

                    points += myScore;
                    if (myScore > oppScore) wins++;
                    else if (myScore < oppScore) losses++;
                }

                baseStandings.Add(new LeagueStandingDto
                {
                    TeamId = team.Id, // Store Team ID internally, verify logic if used externally
                    FantasyTeamName = team.Name,
                    GeneralManagerName = team.ManagerName,
                    IsAdmin = team.IsAdmin,
                    // IsMe set later
                    GamesPlayed = wins + losses,
                    Wins = wins,
                    Losses = losses,
                    TotalPoints = points,
                    Division = team.Division
                    // TeamId (int) or UserId (string) needed? 
                    // Previous logic used Team.UserId for matching matches, but returning TeamId int for FE might be better or mixed.
                    // Let's stick to DTO: TeamId is int. BUT we need UserId to check IsMe.
                    // Let's treat DTO TeamId as int. And we need to know WHICH USER owns it to set IsMe.
                });
            }

            // Order
            baseStandings = baseStandings
                .OrderByDescending(s => s.WinPercentage)
                .ThenByDescending(s => s.TotalPoints)
                .ToList();

            // Cache for 30 seconds (Quick updates during setup)
            _cache.Set(standingCacheKey, baseStandings, TimeSpan.FromSeconds(30));
        }

        // Map IsMe
        // Requires knowing the UserId associated with each Standing.
        // Wait, baseStandings DTO stores TeamId (int).
        // I need to map TeamId -> UserId efficiently or store UserId in DTO (hidden from cache? No).
        
        // Re-fetching teams to map ID -> User? No, inefficient.
        // Let's assume we can map using the League object we just fetched? Yes.
        
        var myTeam = leagueData.Teams.FirstOrDefault(t => t.UserId == request.UserId);
        int myTeamId = myTeam?.Id ?? 0;

        var finalStandings = baseStandings.Select(s => new LeagueStandingDto
        {
            TeamId = s.TeamId,
            FantasyTeamName = s.FantasyTeamName,
            GeneralManagerName = s.GeneralManagerName,
            IsAdmin = s.IsAdmin,
            GamesPlayed = s.GamesPlayed,
            Wins = s.Wins,
            Losses = s.Losses,
            TotalPoints = s.TotalPoints,
            IsMe = s.TeamId == myTeamId,
            Division = s.Division
        }).ToList();

        var finalResult = new LeagueDetailsDto
        {
            Name = leagueData.Name,
            InviteCode = leagueData.InvitationCode,
            Standings = finalStandings
        };

        // Cache the whole result for 30 seconds
        _cache.Set(fullCacheKey, finalResult, TimeSpan.FromSeconds(30));

        return Result<LeagueDetailsDto>.Success(finalResult);
    }
}
