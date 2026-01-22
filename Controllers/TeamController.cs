using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FantasyBasket.API.Common;

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
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

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
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.LeagueId == leagueId)
            .Select(t => new {
                t.Id,
                t.Name,
                t.UserId,
                t.LeagueId,
                t.IsAdmin,
                t.Division,
                t.LogoVersion
            })
            .FirstOrDefaultAsync();

        if (team == null) return NotFound(ErrorCodes.TEAM_NOT_FOUND);

        return Ok(team);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeam(int id)
    {
        var team = await _context.Teams
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new {
                t.Id,
                t.Name,
                t.UserId,
                t.LeagueId,
                t.IsAdmin,
                t.Division,
                t.LogoVersion
            })
            .FirstOrDefaultAsync();

        if (team == null) return NotFound();
        return Ok(team);
    }

    [HttpPost("{id}/logo")]
    public async Task<IActionResult> UploadLogo(int id, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ErrorCodes.NO_FILE_UPLOADED);
        if (file.Length > 5 * 1024 * 1024) return BadRequest(ErrorCodes.FILE_TOO_LARGE);

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FindAsync(id);

        if (team == null) return NotFound();
        if (team.UserId != userId) return Forbid(); // Only owner can upload

        using (var memoryStream = new MemoryStream())
        {
            await file.CopyToAsync(memoryStream);
            team.LogoData = memoryStream.ToArray();
            team.LogoContentType = file.ContentType;
            team.LogoVersion++; // Cache Busting
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Logo uploaded successfully", logoVersion = team.LogoVersion });
    }

    [HttpGet("{id}/logo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLogo(int id)
    {
        var team = await _context.Teams
            .Where(t => t.Id == id)
            .Select(t => new { t.LogoData, t.LogoContentType })
            .FirstOrDefaultAsync();

        if (team == null || team.LogoData == null)
        {
            return NotFound(ErrorCodes.NOT_FOUND);
        }

        Response.Headers.Append("Cache-Control", "public, max-age=31536000, immutable");

        return File(team.LogoData, team.LogoContentType ?? "image/png");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeam(int id, [FromBody] UpdateTeamDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FindAsync(id);

        if (team == null) return NotFound();
        if (team.UserId != userId) return Forbid();

        team.Name = dto.Name;
        await _context.SaveChangesAsync();
        return Ok(team);
    }

    private int GetCurrentLeagueId()
    {
        if (Request.Headers.TryGetValue("X-League-Id", out var leagueIdVal))
            if (int.TryParse(leagueIdVal, out int leagueId)) return leagueId;
        return 0;
    }
}