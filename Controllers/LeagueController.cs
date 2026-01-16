using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class LeagueController : ControllerBase
{
    private readonly MediatR.IMediator _mediator;

    public LeagueController(MediatR.IMediator mediator)
    {
        _mediator = mediator;
    }

    // POST: api/league/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateLeague([FromBody] Models.Dto.CreateLeagueDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.League.CreateLeague.CreateLeagueCommand(dto.LeagueName, dto.MyTeamName, userId);

        var result = await _mediator.Send(command);

        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    // POST: api/league/join
    [HttpPost("join")]
    public async Task<IActionResult> JoinLeague([FromBody] Models.Dto.JoinLeagueDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.League.JoinLeague.JoinLeagueCommand(dto.Code, dto.MyTeamName, userId);

        var result = await _mediator.Send(command);

        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    // GET: api/league/my-leagues
    [HttpGet("my-leagues")]
    public async Task<IActionResult> GetMyLeagues()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.League.GetMyLeagues.GetMyLeaguesQuery(userId);

        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("details")]
    public async Task<IActionResult> GetLeagueDetails([FromHeader(Name = "X-League-Id")] int leagueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.League.GetLeagueDetails.GetLeagueDetailsQuery(leagueId, userId);

        var result = await _mediator.Send(query);

        if (!result.IsSuccess) return NotFound(result.Error);

        return Ok(result.Value);
    }

    // --- TRADE CENTER: ALL ROSTERS ---
    [HttpGet("all-rosters")]
    public async Task<IActionResult> GetAllRosters([FromHeader(Name = "X-League-Id")] int leagueId)
    {
        var query = new Features.League.GetAllRosters.GetAllRostersQuery(leagueId);
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}