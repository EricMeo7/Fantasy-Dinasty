using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class MatchController : ControllerBase
{
    private readonly MediatR.IMediator _mediator;

    public MatchController(MediatR.IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/match/league-schedule
    [HttpGet("league-schedule")]
    public async Task<IActionResult> GetLeagueSchedule([FromHeader(Name = "X-League-Id")] int leagueId)
    {
        var query = new Features.League.GetMatchups.GetMatchupsQuery(leagueId);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    // GET: api/match/current (Partita della settimana corrente per l'utente loggato)
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentMatchup([FromHeader(Name = "X-League-Id")] int leagueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.League.GetMatchDetails.GetCurrentMatchupQuery(userId, leagueId);

        var result = await _mediator.Send(query);

        if (!result.IsSuccess) return Ok(null); // Return empty for no match instead of error
        return Ok(result.Value);
    }

    // GET: api/match/{matchId} (Dettaglio di una partita specifica dal calendario)
    [HttpGet("{matchId}")]
    public async Task<IActionResult> GetMatchDetails(int matchId, [FromHeader(Name = "X-League-Id")] int leagueId)
    {
        var query = new Features.League.GetMatchDetails.GetMatchDetailsQuery(matchId, leagueId);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess) return NotFound(result.Error);
        return Ok(result.Value);
    }
}