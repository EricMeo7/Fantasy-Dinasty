using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Data;
using FantasyBasket.API.Features.Stats.GetPlayerPool;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class StatsController : ControllerBase
{
    private readonly MediatR.IMediator _mediator;
    private readonly ApplicationDbContext _context;

    public StatsController(MediatR.IMediator mediator, ApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet("players")]
    public async Task<IActionResult> GetPlayers(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromQuery] string? season,
        [FromQuery] string? nameSearch,
        [FromQuery] string? position,
        [FromQuery] string? nbaTeam,
        [FromQuery] double? minPts,
        [FromQuery] double? minReb,
        [FromQuery] double? minAst,
        [FromQuery] double? minStl,
        [FromQuery] double? minBlk,
        [FromQuery] double? minFpts,
        [FromQuery] double? minMin,
        [FromQuery] int? minGp,
        [FromQuery] double? minFgPct,
        [FromQuery] double? min3pPct,
        [FromQuery] double? minFtPct,
        [FromQuery] bool? onlyFreeAgents,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string sortBy = "FantasyPoints",
        [FromQuery] bool isDescending = true)
    {
        var query = new GetPlayerPoolQuery
        {
            LeagueId = leagueId,
            Season = season,
            NameSearch = nameSearch,
            Position = position,
            NbaTeam = nbaTeam,
            MinPts = minPts,
            MinReb = minReb,
            MinAst = minAst,
            MinStl = minStl,
            MinBlk = minBlk,
            MinFpts = minFpts,
            MinMin = minMin,
            MinGp = minGp,
            MinFgPct = minFgPct,
            Min3pPct = min3pPct,
            MinFtPct = minFtPct,
            OnlyFreeAgents = onlyFreeAgents,
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            IsDescending = isDescending
        };

        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("seasons")]
    public async Task<IActionResult> GetSeasons()
    {
        var seasons = await _context.PlayerSeasonStats
            .Select(s => s.Season)
            .Distinct()
            .OrderByDescending(s => s)
            .ToListAsync();
            
        return Ok(seasons);
    }
}
