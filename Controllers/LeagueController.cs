using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class LeagueController : ControllerBase
{
    private readonly MediatR.IMediator _mediator;
    private readonly Data.ApplicationDbContext _context;

    public LeagueController(MediatR.IMediator mediator, Data.ApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
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

    // POST: api/league/{id}/leave
    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveLeague(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.League.LeaveLeague.LeaveLeagueCommand(id, userId);

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

    // ==========================================
    // LEAGUE SETTINGS & LOGO (Direct DB Access)
    // ==========================================

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLeague(int id, [FromBody] Models.Dto.UpdateLeagueDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Auth check manually since using direct DB
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == id && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        var league = await _context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        league.Name = dto.Name;
        // Optionally update other settings here
        
        await _context.SaveChangesAsync();
        return Ok(league);
    }

    [HttpPost("{id}/logo")]
    public async Task<IActionResult> UploadLogo(int id, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest(ErrorCodes.NO_FILE_UPLOADED);
        if (file.Length > 5 * 1024 * 1024) return BadRequest(ErrorCodes.FILE_TOO_LARGE);

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Check Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == id && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        var league = await _context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        using (var memoryStream = new MemoryStream())
        {
            await file.CopyToAsync(memoryStream);
            league.LogoData = memoryStream.ToArray();
            league.LogoContentType = file.ContentType;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Logo uploaded successfully" });
    }

    [HttpGet("{id}/logo")]
    [AllowAnonymous] // Allow public access for images (optional, usually ok for logos)
    public async Task<IActionResult> GetLogo(int id)
    {
        var league = await _context.Leagues
            .Where(l => l.Id == id)
            .Select(l => new { l.LogoData, l.LogoContentType }) // Projection to only fetch image data
            .FirstOrDefaultAsync();

        if (league == null || league.LogoData == null)
        {
            // Return placeholder or 404
            return NotFound(ErrorCodes.NOT_FOUND);
        }

        Response.Headers.Append("Cache-Control", "public, max-age=86400");

        return File(league.LogoData, league.LogoContentType ?? "image/png");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLeague(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == id && t.UserId == userId);
        
        if (team == null || !team.IsAdmin) return Forbid();

        var league = await _context.Leagues.FindAsync(id);
        if (league == null) return NotFound();

        // 1. Manual Cleanup to handle Restricted FKs
        // Trades first because they might reference DraftPicks (via TradePickOffer)
        var trades = await _context.Trades.Where(t => t.LeagueId == id).ToListAsync();
        if (trades.Any()) _context.Trades.RemoveRange(trades);

        // DraftPicks reference Teams with Restrict, so they must go after trades but before teams
        var picks = await _context.DraftPicks.Where(p => p.LeagueId == id).ToListAsync();
        if (picks.Any()) _context.DraftPicks.RemoveRange(picks);

        var matchups = await _context.Matchups.Where(m => m.LeagueId == id).ToListAsync();
        if (matchups.Any()) _context.Matchups.RemoveRange(matchups);

        var auctions = await _context.Auctions.Where(a => a.LeagueId == id).ToListAsync();
        if (auctions.Any()) _context.Auctions.RemoveRange(auctions);

        // 2. Remove the League (cascades to Teams and Settings)
        _context.Leagues.Remove(league);
        await _context.SaveChangesAsync();

        return Ok(new { message = "League deleted" });
    }

    [HttpDelete("{id}/teams/{teamId}")]
    public async Task<IActionResult> RemoveTeam(int id, int teamId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // 1. Am I Admin?
        var adminTeam = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == id && t.UserId == currentUserId);
        if (adminTeam == null || !adminTeam.IsAdmin) return Forbid();

        // 2. Find Target Team
        var targetTeam = await _context.Teams.FindAsync(teamId);
        if (targetTeam == null) return NotFound(ErrorCodes.TEAM_NOT_FOUND);
        if (targetTeam.LeagueId != id) return BadRequest("Team belongs to another league");

        // Prevent suicide (optional)
        if (targetTeam.UserId == currentUserId) return BadRequest("Cannot kick yourself. Use 'Leave League' or Delete League.");

        _context.Teams.Remove(targetTeam);
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "Team removed from league" });
    }
}