using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq.Dynamic.Core;

namespace FantasyBasket.API.Features.Stats.GetPlayerPool;

public class GetPlayerPoolHandler : IRequestHandler<GetPlayerPoolQuery, PlayerPoolResponse>
{
    private readonly ApplicationDbContext _context;

    public GetPlayerPoolHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PlayerPoolResponse> Handle(GetPlayerPoolQuery request, CancellationToken cancellationToken)
    {
        // 1. Base Query: Start from Players
        var query = _context.Players.AsNoTracking();

        // 2. Filter by Name/Position/NbaTeam
        if (!string.IsNullOrWhiteSpace(request.NameSearch))
        {
            var search = request.NameSearch.ToLower();
            // Optimized: Use separate Where to leverage indexes on LastName/FirstName if possible
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

        // 3. Select DTO based on Season
        // If Season is null, use current stats on Player. Otherwise use historical.
        IQueryable<PlayerPoolDto> dtoQuery;

        if (string.IsNullOrEmpty(request.Season))
        {
            dtoQuery = from p in query
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
                            DoubleDoubles = p.DoubleDoubles,
                            TripleDoubles = p.TripleDoubles,
                            FantasyPoints = p.FantasyPoints,
                            InjuryStatus = p.InjuryStatus,
                            InjuryBodyPart = p.InjuryBodyPart,
                            InjuryReturnDate = p.InjuryReturnDate
                        };
        }
        else
        {
            dtoQuery = from p in query
                       join s in _context.PlayerSeasonStats.Where(x => x.Season == request.Season) on p.Id equals s.PlayerId
                       join c in _context.Contracts.Where(x => x.Team.LeagueId == request.LeagueId) on p.Id equals c.PlayerId into gj
                       from subContract in gj.DefaultIfEmpty()
                       select new PlayerPoolDto
                       {
                           PlayerId = p.Id,
                           ExternalId = p.ExternalId,
                           Name = p.FirstName + " " + p.LastName,
                           Position = p.Position,
                           NbaTeam = s.NbaTeam, // Use team for that season
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
                           FantasyPoints = s.FantasyPoints,
                           
                           // Historical stats don't have detailed splits in this table, mapped to defaults
                           Fgm = 0, Fga = 0, ThreePm = 0, ThreePa = 0, Ftm = 0, Fta = 0,
                           OffRebounds = 0, DefRebounds = 0, PlusMinus = 0, Efficiency = 0,
                           DoubleDoubles = 0, TripleDoubles = 0,
                           InjuryStatus = null, InjuryBodyPart = null, InjuryReturnDate = null
                       };
        }

        // 4. More Filters
        if (request.MinPts.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgPoints >= request.MinPts.Value);
        if (request.MinReb.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgRebounds >= request.MinReb.Value);
        if (request.MinAst.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgAssists >= request.MinAst.Value);
        if (request.MinStl.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgSteals >= request.MinStl.Value);
        if (request.MinBlk.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgBlocks >= request.MinBlk.Value);
        if (request.MinFpts.HasValue) dtoQuery = dtoQuery.Where(x => x.FantasyPoints >= request.MinFpts.Value);
        if (request.MinMin.HasValue) dtoQuery = dtoQuery.Where(x => x.AvgMinutes >= request.MinMin.Value);
        if (request.MinGp.HasValue) dtoQuery = dtoQuery.Where(x => x.GamesPlayed >= request.MinGp.Value);
        if (request.MinFgPct.HasValue) dtoQuery = dtoQuery.Where(x => x.FgPercent >= request.MinFgPct.Value / 100);
        if (request.Min3pPct.HasValue) dtoQuery = dtoQuery.Where(x => x.ThreePtPercent >= request.Min3pPct.Value / 100);
        if (request.MinFtPct.HasValue) dtoQuery = dtoQuery.Where(x => x.FtPercent >= request.MinFtPct.Value / 100);
        
        if (request.OnlyFreeAgents == true)
        {
            dtoQuery = dtoQuery.Where(x => x.FantasyTeamName == null);
        }

        // 5. Sorting
        var order = request.IsDescending ? "descending" : "ascending";
        try 
        {
            var sortBy = request.SortBy;
            if (string.IsNullOrEmpty(sortBy)) sortBy = "FantasyPoints";
            
            // Map common frontend fields to backend DTO fields
            if (sortBy == "name") sortBy = "Name";
            if (sortBy == "fantasyPoints") sortBy = "FantasyPoints";
            if (sortBy == "avgPoints") sortBy = "AvgPoints";
            if (sortBy == "avgRebounds") sortBy = "AvgRebounds";
            if (sortBy == "avgAssists") sortBy = "AvgAssists";
            if (sortBy == "gamesPlayed") sortBy = "GamesPlayed";
            if (sortBy == "avgMinutes") sortBy = "AvgMinutes";
            
            dtoQuery = dtoQuery.OrderBy($"{sortBy} {order}");
        }
        catch 
        {
            // Fallback sort
            dtoQuery = dtoQuery.OrderByDescending(x => x.FantasyPoints);
        }

        // 6. Pagination & Execution
        var totalCount = await dtoQuery.CountAsync(cancellationToken);
        var players = await dtoQuery
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PlayerPoolResponse
        {
            Players = players,
            TotalCount = totalCount
        };
    }
}
