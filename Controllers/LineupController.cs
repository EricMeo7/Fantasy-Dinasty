using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class LineupController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INbaDataService _nbaService;

    public LineupController(ApplicationDbContext context, INbaDataService nbaService)
    {
        _context = context;
        _nbaService = nbaService;
    }

    private int GetCurrentLeagueId()
    {
        if (Request.Headers.TryGetValue("X-League-Id", out var leagueIdVal))
            if (int.TryParse(leagueIdVal, out int leagueId)) return leagueId;
        return 0;
    }

    [HttpGet("day")]
    public async Task<IActionResult> GetDailyLineup(
        [FromQuery] DateTime date, 
        [FromServices] MediatR.IMediator mediator,
        [FromQuery] int? targetTeamId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        int leagueId = GetCurrentLeagueId();

        var query = new Features.Lineup.GetLineup.GetLineupQuery(date, userId, leagueId, targetTeamId);
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetLineupStatus(
        [FromQuery] DateTime? date,
        [FromServices] MediatR.IMediator mediator)
    {
        int leagueId = GetCurrentLeagueId();
        var targetDate = date ?? DateTime.UtcNow.Date;
        var query = new Features.Lineup.GetLineupLockStatus.GetLineupLockStatusQuery(leagueId, targetDate);
        var result = await mediator.Send(query);
        
        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpPost("save")]
    public async Task<IActionResult> SaveLineup(
        [FromBody] SaveLineupDto dto,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        int leagueId = GetCurrentLeagueId();
        var query = new Features.League.GetLeagueDetails.GetLeagueDetailsQuery(leagueId, userId);

        var command = new Features.Lineup.UpdateLineup.UpdateLineupCommand
        {
            Date = dto.Date,
            StarterSlots = dto.StarterSlots,
            Bench = dto.Bench,
            UserId = userId,
            LeagueId = leagueId
        };

        var result = await mediator.Send(command);

        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = "Formazione salvata" });
    }

    public class SaveLineupDto
    {
        public DateTime Date { get; set; }
        public Dictionary<string, int> StarterSlots { get; set; } = new();
        public List<int> Bench { get; set; } = new();
    }
}