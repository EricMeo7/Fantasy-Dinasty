using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Linq.Dynamic.Core;
using FantasyBasket.API.Services;
using FantasyBasket.API.Models;

namespace FantasyBasket.API.Features.Stats.GetPlayerPool;

public class GetPlayerPoolHandler : IRequestHandler<GetPlayerPoolQuery, PlayerPoolResponse>
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public GetPlayerPoolHandler(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }
    


    public async Task<PlayerPoolResponse> Handle(GetPlayerPoolQuery request, CancellationToken cancellationToken)
    {
        // 0. Caching logic
        string cacheKey = $"player_pool_{request.LeagueId}_{request.Season}_{request.NameSearch}_{request.Position}_{request.NbaTeam}_" +
                         $"{request.MinPts}_{request.MinReb}_{request.MinAst}_{request.MinStl}_{request.MinBlk}_{request.MinFpts}_" +
                         $"{request.MinMin}_{request.MinGp}_{request.MinFgPct}_{request.Min3pPct}_{request.MinFtPct}_" +
                         $"{request.OnlyFreeAgents}_{request.SortBy}_{request.IsDescending}_{request.Page}_{request.PageSize}";

        if (_cache.TryGetValue(cacheKey, out PlayerPoolResponse? cachedResponse) && cachedResponse != null)
        {
            return cachedResponse;
        }

        // FETCH SETTINGS
        var settings = await _context.LeagueSettings.AsNoTracking()
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(s => s.LeagueId == request.LeagueId, cancellationToken);
        var leagueSettings = settings ?? new Models.LeagueSettings();

        // 1. Base Query: Start from Players
        var query = _context.Players.AsNoTracking();

        // 2. Filter by Name/Position/NbaTeam (Safe for SQL)
        if (!string.IsNullOrWhiteSpace(request.NameSearch))
        {
            var search = request.NameSearch.ToLower();
            query = query.Where(p => p.FirstName.ToLower().Contains(search) || p.LastName.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(request.Position))
        {
            query = query.Where(p => p.Position.Contains(request.Position));
        }

        if (!string.IsNullOrWhiteSpace(request.NbaTeam))
        {
            query = query.Where(p => p.NbaTeam == request.NbaTeam);
        }

        // 3. Select DTO based on Season (Fetch to Memory)
        List<PlayerPoolDto> rawPlayers;

        if (string.IsNullOrEmpty(request.Season))
        {
            rawPlayers = await (from p in query
                       join c in _context.Contracts.Where(x => x.Team.LeagueId == request.LeagueId) on p.Id equals c.PlayerId into gj
                       from subContract in gj.DefaultIfEmpty()
                       select new PlayerPoolDto
                       {
                           PlayerId = p.Id,
                           ExternalId = p.ExternalId,
                           Name = p.FirstName + " " + p.LastName,
                           Position = p.Position,
                           NbaTeam = p.NbaTeam,
                           FantasyTeamName = subContract != null ? subContract.Team.Name : null,
                           FantasyTeamId = subContract != null ? subContract.TeamId : null,
                           
                            GamesPlayed = p.GamesPlayed,
                            AvgMinutes = p.AvgMinutes,
                            AvgPoints = p.AvgPoints,
                            AvgRebounds = p.AvgRebounds,
                            AvgAssists = p.AvgAssists,
                            AvgSteals = p.AvgSteals,
                            AvgBlocks = p.AvgBlocks,
                            AvgTurnovers = p.AvgTurnovers,
                            FgPercent = p.FgPercent,
                            Fgm = p.Fgm,
                            Fga = p.Fga,
                            ThreePm = p.ThreePm,
                            ThreePa = p.ThreePa,
                            ThreePtPercent = p.ThreePtPercent,
                            Ftm = p.Ftm,
                            Fta = p.Fta,
                            FtPercent = p.FtPercent,
                            OffRebounds = p.OffRebounds,
                            DefRebounds = p.DefRebounds,
                            PlusMinus = p.PlusMinus,
                            Efficiency = p.Efficiency,
                            WinPct = p.WinPct, // Added for Calculator
                            DoubleDoubles = p.DoubleDoubles,
                            TripleDoubles = p.TripleDoubles,
                            // FantasyPoints will be calculated in memory
                            InjuryStatus = p.InjuryStatus,
                            InjuryBodyPart = p.InjuryBodyPart,
                            InjuryReturnDate = p.InjuryReturnDate
                        })
                        .ToListAsync(cancellationToken);
        }
        else
        {
            rawPlayers = await (from p in query
                       join s in _context.PlayerSeasonStats.Where(x => x.Season == request.Season) on p.Id equals s.PlayerId
                       join c in _context.Contracts.Where(x => x.Team.LeagueId == request.LeagueId) on p.Id equals c.PlayerId into gj
                       from subContract in gj.DefaultIfEmpty()
                       select new PlayerPoolDto
                       {
                           PlayerId = p.Id,
                           ExternalId = p.ExternalId,
                           Name = p.FirstName + " " + p.LastName,
                           Position = p.Position,
                           NbaTeam = s.NbaTeam,
                           FantasyTeamName = subContract != null ? subContract.Team.Name : null,
                           FantasyTeamId = subContract != null ? subContract.TeamId : null,

                           GamesPlayed = s.GamesPlayed,
                           AvgMinutes = s.AvgMinutes,
                           AvgPoints = s.AvgPoints,
                           AvgRebounds = s.AvgRebounds,
                           AvgAssists = s.AvgAssists,
                           AvgSteals = s.AvgSteals,
                           AvgBlocks = s.AvgBlocks,
                           AvgTurnovers = s.AvgTurnovers,
                           FgPercent = s.FgPercent,
                           ThreePtPercent = s.ThreePtPercent,
                           FtPercent = s.FtPercent,
                           
                           Fgm = s.Fgm, Fga = s.Fga, ThreePm = s.ThreePm, ThreePa = s.ThreePa, Ftm = s.Ftm, Fta = s.Fta,
                           OffRebounds = s.OffRebounds, DefRebounds = s.DefRebounds, PlusMinus = s.PlusMinus, Efficiency = s.Efficiency,
                           WinPct = s.WinPct, // Added for Calculator
                           DoubleDoubles = s.DoubleDoubles, TripleDoubles = s.TripleDoubles,
                           InjuryStatus = null, InjuryBodyPart = null, InjuryReturnDate = null
                       })
                       .ToListAsync(cancellationToken);
        }

        // 4. Calculate Fantasy Points & Apply Filters (In Memory)
        var filteredPlayers = new List<PlayerPoolDto>();

        foreach (var p in rawPlayers)
        {
            // Manual mapping to calculator inputs since we don't have the Entity here, just DTO.
            // Or create a Calculator Overload for DTO? 
            // Better: Duplicate calc logic here OR map DTO back to a dummy Player object (ugly).
            // Actually, PlayerPoolDto has all fields. Defining a helper method inside Handler or Calculator is cleaner.
            // Let's call a local helper or inline. Inline using Calculator static method is tricky because signature expects Player/PlayerSeasonStat.
            // I'll create a dummy Calc method here or mapping.
            // Mapping is easiest.
            
            p.FantasyPoints = CalculateDtoFp(p, leagueSettings);

            // Filter
            if (request.MinPts.HasValue && p.AvgPoints < request.MinPts.Value) continue;
            if (request.MinReb.HasValue && p.AvgRebounds < request.MinReb.Value) continue;
            if (request.MinAst.HasValue && p.AvgAssists < request.MinAst.Value) continue;
            if (request.MinStl.HasValue && p.AvgSteals < request.MinStl.Value) continue;
            if (request.MinBlk.HasValue && p.AvgBlocks < request.MinBlk.Value) continue;
            if (request.MinFpts.HasValue && p.FantasyPoints < request.MinFpts.Value) continue;
            if (request.MinMin.HasValue && p.AvgMinutes < request.MinMin.Value) continue;
            if (request.MinGp.HasValue && p.GamesPlayed < request.MinGp.Value) continue;
            if (request.MinFgPct.HasValue && p.FgPercent < request.MinFgPct.Value / 100) continue;
            if (request.Min3pPct.HasValue && p.ThreePtPercent < request.Min3pPct.Value / 100) continue;
            if (request.MinFtPct.HasValue && p.FtPercent < request.MinFtPct.Value / 100) continue;
            
            if (request.OnlyFreeAgents == true && p.FantasyTeamName != null) continue;

            filteredPlayers.Add(p);
        }

        // 5. Sorting
        var sortProp = request.SortBy?.ToLower() ?? "fantasypoints";
        var isDesc = request.IsDescending;

        Func<PlayerPoolDto, object> keySelector = sortProp switch 
        {
            "name" => x => x.Name,
            "avgpoints" => x => x.AvgPoints,
            "avgrebounds" => x => x.AvgRebounds,
            "avgassists" => x => x.AvgAssists,
            "gamesplayed" => x => x.GamesPlayed,
            "avgminutes" => x => x.AvgMinutes,
            _ => x => x.FantasyPoints
        };

        if (isDesc)
            filteredPlayers = filteredPlayers.OrderByDescending(keySelector).ToList();
        else
            filteredPlayers = filteredPlayers.OrderBy(keySelector).ToList();


        // 6. Pagination
        var totalCount = filteredPlayers.Count;
        var pagedPlayers = filteredPlayers
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        var finalResult = new PlayerPoolResponse
        {
            Players = pagedPlayers,
            TotalCount = totalCount
        };

        _cache.Set(cacheKey, finalResult, TimeSpan.FromSeconds(120));

        return finalResult;
    }

    private double CalculateDtoFp(PlayerPoolDto p, Models.LeagueSettings settings)
    {
        return FantasyPointCalculator.Calculate(
            p.AvgPoints, p.AvgRebounds, p.AvgAssists, p.AvgSteals, p.AvgBlocks, p.AvgTurnovers,
            p.Fgm, p.Fga, p.Ftm, p.Fta, p.ThreePm, p.ThreePa,
            p.OffRebounds, p.DefRebounds, 
            false, // Won is false (handled by win bonus below)
            settings
        ) - settings.LossWeight // Neutralize implicit LossWeight
          + (p.WinPct * settings.WinWeight) + ((1.0 - p.WinPct) * settings.LossWeight);
    }
}
