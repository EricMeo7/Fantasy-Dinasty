using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[ApiController]
[Route("api/league/{leagueId}/rookie-draft")]
public class RookieDraftController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RookieDraftController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("repair-picks")]
    public async Task<IActionResult> RepairPicks(int leagueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == leagueId && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        var currentSeasonStr = await _context.Leagues
            .Where(l => l.Id == leagueId)
            .Select(l => l.CurrentSeason)
            .FirstOrDefaultAsync();

        if (currentSeasonStr == null) return NotFound("League not found");

        int correctSeason = SeasonHelper.ParseStartYear(currentSeasonStr);
        int wrongSeason = correctSeason + 1;

        // Find picks that were generated with the "End Year" instead of "Start Year"
        var picksToFix = await _context.DraftPicks
            .Where(p => p.LeagueId == leagueId && p.Season == wrongSeason)
            .ToListAsync();

        if (!picksToFix.Any())
        {
            return Ok(new { message = "No picks found with the old season index (wrong year). You might need to generate them first." });
        }

        foreach (var p in picksToFix)
        {
            p.Season = correctSeason;
        }

        await _context.SaveChangesAsync();

        return Ok(new { 
            message = $"Successfully updated {picksToFix.Count} picks from {wrongSeason} to {correctSeason}.",
            seasonUsed = correctSeason
        });
    }

    [HttpPost("cleanup-rookies")]
    public async Task<IActionResult> CleanupRookies(int leagueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == leagueId && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        // This is a global cleanup: only players whose DraftYear matches the current year of one of the active leagues
        // should be rookies. (Simplified: for this league, strictly match the league's current season)
        var currentSeasonStr = await _context.Leagues
            .Where(l => l.Id == leagueId)
            .Select(l => l.CurrentSeason)
            .FirstOrDefaultAsync();

        if (currentSeasonStr == null) return NotFound();

        int currentRookieYear = SeasonHelper.ParseStartYear(currentSeasonStr);

        var wronglyMarked = await _context.Players
            .Where(p => p.IsRookie && p.DraftYear != currentRookieYear)
            .ToListAsync();

        foreach (var p in wronglyMarked)
        {
            p.IsRookie = false;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Cleaned up {wronglyMarked.Count} players wrongly marked as rookies." });
    }
}
