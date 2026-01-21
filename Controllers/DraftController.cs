using FantasyBasket.API.Data;
using FantasyBasket.API.Features.Draft.AssignDraftPick;
using FantasyBasket.API.Features.Draft.GetDraftAssets;
using FantasyBasket.API.Features.Draft.GetDraftBoard;
using FantasyBasket.API.Features.Draft.RunLottery;
using FantasyBasket.API.Features.Draft.RevealLotteryPick;
using FantasyBasket.API.Features.Draft.GetLotteryProbabilities; // Added
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class DraftController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ApplicationDbContext _context;

    public DraftController(IMediator mediator, ApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet("my-assets")]
    public async Task<IActionResult> GetMyDraftAssets()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var leagueId = GetCurrentLeagueId();

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Get user's team in this league
        var teamId = await GetUserTeamIdAsync(leagueId, userId);
        if (teamId == null)
            return NotFound(new { error = "Team not found in this league" });

        var query = new GetDraftAssetsQuery(teamId.Value);
        var result = await _mediator.Send(query);

        return Ok(result);
    }

    [HttpGet("board")]
    public async Task<IActionResult> GetDraftBoard([FromQuery] int season)
    {
        var leagueId = GetCurrentLeagueId();

        var query = new GetDraftBoardQuery(leagueId, season);
        var result = await _mediator.Send(query);

        return Ok(result);
    }

    [HttpPost("lottery")]
    // [Authorize(Policy = "AdminOnly")] // Removed: using manual IsLeagueAdmin check
    public async Task<IActionResult> RunLottery([FromBody] RunLotteryRequest request)
    {
        var leagueId = GetCurrentLeagueId();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!await IsLeagueAdminAsync(leagueId, userId))
            return Forbid();

        var command = new RunLotteryCommand(leagueId, request.Season);
        var result = await _mediator.Send(command);

        return Ok(result);
    }

    [HttpPost("lottery/reveal")]
    public async Task<IActionResult> RevealNextLotteryPick([FromBody] RunLotteryRequest request)
    {
        var leagueId = GetCurrentLeagueId();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!await IsLeagueAdminAsync(leagueId, userId))
            return Forbid();

        var command = new FantasyBasket.API.Features.Draft.RevealLotteryPick.RevealLotteryPickCommand(leagueId, request.Season);
        var result = await _mediator.Send(command);

        if (result == null)
            return NotFound(new { message = $"No unrevealed lottery picks found for league {leagueId} season {request.Season}." });

        return Ok(result);
    }

    [HttpGet("lottery-probabilities")]
    public async Task<ActionResult<List<LotteryProbabilityDto>>> GetLotteryProbabilities([FromQuery] int season)
    {
        var leagueId = GetCurrentLeagueId();
        var result = await _mediator.Send(new GetLotteryProbabilitiesQuery(leagueId, season));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("assign-pick")]
    // [Authorize(Policy = "AdminOnly")] // Removed: using manual IsLeagueAdmin check
    public async Task<IActionResult> AssignDraftPick([FromBody] AssignDraftPickRequest request)
    {
        var leagueId = GetCurrentLeagueId();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!await IsLeagueAdminAsync(leagueId, userId))
            return Forbid();

        var command = new AssignDraftPickCommand(request.PickId, request.PlayerId);
        var result = await _mediator.Send(command);

        if (!result.Success)
            return BadRequest(new { error = result.Message });

        return Ok(result);
    }

    [HttpPost("init")]
    // [Authorize(Policy = "AdminOnly")] // Removed: using manual IsLeagueAdmin check
    public async Task<IActionResult> InitDraft([FromServices] FantasyBasket.API.Services.IDraftService draftService)
    {
        var leagueId = GetCurrentLeagueId();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!await IsLeagueAdminAsync(leagueId, userId))
            return Forbid();

        await draftService.EnsurePicksFor3SeasonsAsync(leagueId);
        return Ok(new { message = "Draft system initialized for 3 seasons." });
    }

    private async Task<bool> IsLeagueAdminAsync(int leagueId, string? userId)
    {
        if (string.IsNullOrEmpty(userId) || leagueId <= 0) return false;

        return await _context.Teams
            .AsNoTracking()
            .AnyAsync(t => t.LeagueId == leagueId && t.UserId == userId && t.IsAdmin);
    }

    private int GetCurrentLeagueId()
    {
        if (Request.Headers.TryGetValue("X-League-Id", out var leagueIdVal))
            if (int.TryParse(leagueIdVal, out int leagueId))
                return leagueId;
        return 0;
    }

    private async Task<int?> GetUserTeamIdAsync(int leagueId, string userId)
    {
        var team = await _context.Teams
            .AsNoTracking()
            .Where(t => t.LeagueId == leagueId && t.UserId == userId)
            .Select(t => t.Id)
            .FirstOrDefaultAsync();

        return team == 0 ? null : team;
    }
}

public record RunLotteryRequest(int Season);
public record AssignDraftPickRequest(int PickId, int PlayerId);
