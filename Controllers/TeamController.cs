using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize] // Protegge tutto il controller: serve essere loggati
[Route("api/[controller]")]
[ApiController]
public class TeamController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TeamController(ApplicationDbContext context)
    {
        _context = context;
    }

    // In Controllers/TeamController.cs

    [HttpGet("my-roster")]
    public async Task<IActionResult> GetMyRoster(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var query = new FantasyBasket.API.Features.Roster.GetMyRoster.GetMyRosterQuery(leagueId, userId);
        
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    [HttpPost("release/{id}")]
    public async Task<IActionResult> ReleasePlayer(
        int id,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Team.ReleasePlayer.ReleasePlayerCommand(id, leagueId, userId);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // NOTA: ToggleStarter endpoint rimosso - IsStarter non esiste più in Contract
    // Lo stato starter/bench è ora gestito SOLO tramite DailyLineup (schieramento formazione giornaliera)

    [HttpGet("budget")]
    public async Task<IActionResult> GetMyBudget(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Team.GetBudget.GetBudgetQuery(leagueId, userId);
        
        var result = await mediator.Send(query);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("simulate-release/{id}")]
    public async Task<IActionResult> SimulateRelease(
        int id,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Team.SimulateRelease.SimulateReleaseQuery(id, leagueId, userId);
        
        var result = await mediator.Send(query);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("my-team")]
    public async Task<IActionResult> GetMyTeam()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        int leagueId = GetCurrentLeagueId();

        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);

        if (team == null) return NotFound("Non hai un team in questa lega");

        return Ok(team);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeam(int id)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound();
        return Ok(team);
    }

    private int GetCurrentLeagueId()
    {
        if (Request.Headers.TryGetValue("X-League-Id", out var leagueIdVal))
            if (int.TryParse(leagueIdVal, out int leagueId)) return leagueId;
        return 0;
    }
}