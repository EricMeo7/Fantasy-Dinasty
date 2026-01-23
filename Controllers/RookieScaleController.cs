using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[ApiController]
[Route("api/league/{leagueId}/rookie-scale")]
public class RookieScaleController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RookieScaleController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get(int leagueId)
    {
        var scale = await _context.RookieWageScales
            .Where(s => s.LeagueId == leagueId)
            .OrderBy(s => s.PickNumber)
            .ToListAsync();
        return Ok(scale);
    }

    [HttpPost]
    public async Task<IActionResult> Update(int leagueId, [FromBody] List<RookieWageScale> newScales)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == leagueId && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        var existing = await _context.RookieWageScales.Where(s => s.LeagueId == leagueId).ToListAsync();
        _context.RookieWageScales.RemoveRange(existing);

        foreach (var s in newScales)
        {
            s.LeagueId = leagueId; // Force correct leagueId
            // Reset ID to 0 to ensure insertion
            s.Id = 0; 
        }

        await _context.RookieWageScales.AddRangeAsync(newScales);
        await _context.SaveChangesAsync();

        return Ok(newScales);
    }
    
    // Helper endpoint to check if scales are initialized, if not init default
    [HttpPost("init-default")]
    public async Task<IActionResult> InitDefault(int leagueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.LeagueId == leagueId && t.UserId == userId);
        if (team == null || !team.IsAdmin) return Forbid();

        bool any = await _context.RookieWageScales.AnyAsync(s => s.LeagueId == leagueId);
        if (any) return BadRequest("Already initialized");

        var settings = await _context.LeagueSettings.FirstOrDefaultAsync(s => s.LeagueId == leagueId);
        int numTeams = settings?.NumberOfTeams ?? 12;
        int maxPicks = numTeams * 2;

        var defaults = new List<RookieWageScale>();
        
        // Linear decrease: Slot #1 = $12M, Slot #maxPicks = $1M
        double maxSalary = 12.0;
        double minSalary = 1.0;
        double salaryRange = maxSalary - minSalary;
        double decrement = maxPicks > 1 ? salaryRange / (maxPicks - 1) : 0;

        for (int i = 1; i <= maxPicks; i++)
        {
            double y1 = maxSalary - (decrement * (i - 1));
            
            defaults.Add(new RookieWageScale
            {
                LeagueId = leagueId,
                PickNumber = i,
                Year1Salary = Math.Round(y1, 2),
                Year2Salary = Math.Round(y1, 2),
                Year3OptionPercentage = 20.0
            });
        }
        
        await _context.RookieWageScales.AddRangeAsync(defaults);
        await _context.SaveChangesAsync();
        return Ok(defaults);
    }
}
