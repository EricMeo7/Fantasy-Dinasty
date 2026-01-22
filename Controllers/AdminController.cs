using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using FantasyBasket.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Localization;


namespace FantasyBasket.API.Controllers;

// DTO DEFINITO QUI PER EVITARE PROBLEMI DI SERIALIZZAZIONE
public class GenerateScheduleDto
{
    public int Rounds { get; set; } = 2;
    public int PlayoffTeams { get; set; } = 4;
    public ScheduleMode Mode { get; set; } = ScheduleMode.Weekly;
}

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IDraftService _draftService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    public AdminController(ApplicationDbContext context, IStringLocalizer<SharedResource> localizer, IDraftService draftService)
    {
        _context = context;
        _localizer = localizer;
        _draftService = draftService;
    }

    [HttpPost("force-update-scores")]
    public async Task<IActionResult> ForceUpdateScores(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.UpdateScores.UpdateScoresCommand(leagueId, userId);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    [HttpPost("generate-schedule")]
    public async Task<IActionResult> GenerateSchedule(
        [FromBody] GenerateScheduleDto dto,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.GenerateSchedule.GenerateScheduleCommand(leagueId, userId, dto.PlayoffTeams, dto.Mode);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // GET: api/admin/status
    [HttpGet("status")]
    public async Task<IActionResult> GetLeagueStatus(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var query = new Features.Admin.GetStatus.GetStatusQuery(leagueId);
        var result = await mediator.Send(query);
        
        if (!result.IsSuccess) return Ok(new { status = LeagueState.DraftMode });
        return Ok(new { status = result.Value });
    }

    // POST: api/admin/change-status
    [HttpPost("change-status")]
    public async Task<IActionResult> ChangeStatus(
        [FromBody] LeagueState newState,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.ChangeStatus.ChangeStatusCommand(leagueId, userId, newState);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // POST: api/admin/reset-market
    [HttpPost("reset-market")]
    public async Task<IActionResult> ResetMarket(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.ResetMarket.ResetMarketCommand(leagueId, userId);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // GET: api/admin/members
    [HttpGet("members")]
    public async Task<IActionResult> GetLeagueMembers(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Admin.GetMembers.GetMembersQuery(leagueId, userId);
        
        var result = await mediator.Send(query);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    // GET: api/admin/search-all/{query}
    [HttpGet("search-all/{query}")]
    public async Task<IActionResult> SearchAllPlayers(
        string query,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var q = new Features.Admin.SearchPlayers.SearchPlayersQuery(leagueId, userId, query);
        
        var result = await mediator.Send(q);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    // POST: api/admin/assign-player

        [HttpPost("update-official-injuries")]
        public async Task<IActionResult> UpdateOfficialInjuries([FromServices] OfficialInjuryService injuryService, [FromQuery] bool deep = false)
        {
            try
            {
                var logs = await injuryService.UpdateInjuriesFromOfficialReportAsync(deep);
                return Ok(new { message = _localizer["OfficialInjuryReportImported"].Value, details = logs });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = _localizer["ErrorImportingInjuryReport"].Value, error = ex.Message });
            }
        }

        [HttpPost("assign-player")]
    public async Task<IActionResult> ManualAssign(
        [FromBody] ManualAssignDto dto,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.AssignPlayer.AssignPlayerCommand(
            leagueId, userId, dto.PlayerId, dto.TargetUserId, dto.Salary, dto.Years);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // GET: api/admin/settings
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Admin.GetSettings.GetSettingsQuery(leagueId, userId);
        
        var result = await mediator.Send(query);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }

    // POST: api/admin/settings
    [HttpPost("settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] LeagueSettings input,
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Admin.UpdateSettings.UpdateSettingsCommand(leagueId, userId, input);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    // POST: api/admin/update-nba-schedule
    [HttpPost("update-nba-schedule")]
    public async Task<IActionResult> UpdateNbaSchedule(
        [FromServices] INbaDataService nbaDataService)
    {
        await nbaDataService.ImportSeasonScheduleAsync();
        return Ok(new { message = _localizer["NbaScheduleUpdated"].Value });
    }

    // POST: api/admin/clear-season-stats (TEMPORARY - for re-sync)
    [HttpPost("clear-season-stats")]
    public async Task<IActionResult> ClearSeasonStats()
    {
        try
        {
            // Delete all PlayerSeasonStats to allow fresh re-sync with new fields
            await _context.Database.ExecuteSqlRawAsync("DELETE FROM \"PlayerSeasonStats\"");
            return Ok(new { message = "PlayerSeasonStats table cleared successfully. Run sync to repopulate." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error clearing season stats", error = ex.Message });
        }
    }

}