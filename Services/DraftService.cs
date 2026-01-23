using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Services;

public interface IDraftService
{
    Task GeneratePicksForSeasonAsync(int season, int leagueId);
    Task EnsurePicksFor3SeasonsAsync(int leagueId);
    Task<DraftPick?> AssignPlayerToPickAsync(int pickId, int playerId);
}

public class DraftService : IDraftService
{
    private readonly ApplicationDbContext _context;
    private readonly IRookieSalaryScale _salaryScale;
    private readonly ILogger<DraftService> _logger;

    public DraftService(
        ApplicationDbContext context,
        IRookieSalaryScale salaryScale,
        ILogger<DraftService> logger)
    {
        _context = context;
        _salaryScale = salaryScale;
        _logger = logger;
    }

    public async Task GeneratePicksForSeasonAsync(int season, int leagueId)
    {
        // Get league settings (optimized projection)
        var settings = await _context.LeagueSettings
            .Where(s => s.LeagueId == leagueId)
            .Select(s => new { s.NumberOfTeams })
            .FirstOrDefaultAsync();

        if (settings == null)
        {
            _logger.LogWarning("League settings not found for league {LeagueId}", leagueId);
            return;
        }

        // Get all team IDs (optimized projection)
        var teamIds = await _context.Teams
            .Where(t => t.LeagueId == leagueId)
            .Select(t => t.Id)
            .ToListAsync();

        if (!teamIds.Any())
        {
            _logger.LogWarning("No teams found for league {LeagueId}", leagueId);
            return;
        }

        // Fetch existing picks for this season at once to avoid N+1 duplication checks
        var existingPicks = await _context.DraftPicks
            .Where(p => p.LeagueId == leagueId && p.Season == season)
            .Select(p => new { p.Round, p.OriginalOwnerTeamId })
            .AsNoTracking()
            .ToListAsync();

        // Generate picks for Round 1 and Round 2
        for (int round = 1; round <= 2; round++)
        {
            foreach (var teamId in teamIds)
            {
                // check memory instead of DB
                bool pickExists = existingPicks.Any(p => p.Round == round && p.OriginalOwnerTeamId == teamId);

                if (!pickExists)
                {
                    var draftPick = new DraftPick
                    {
                        Season = season,
                        Round = round,
                        OriginalOwnerTeamId = teamId,
                        CurrentOwnerTeamId = teamId, // Initially owned by original team
                        LeagueId = leagueId,
                        SlotNumber = null, // Will be assigned after lottery
                        PlayerId = null // Will be assigned during draft
                    };

                    _context.DraftPicks.Add(draftPick);
                }
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Generated {Count} draft picks for season {Season} in league {LeagueId}",
            teamIds.Count * 2, season, leagueId);
    }

    public async Task EnsurePicksFor3SeasonsAsync(int leagueId)
    {
        // Get current season (optimized projection)
        var currentSeasonStr = await _context.LeagueSettings
            .Where(s => s.LeagueId == leagueId)
            .Select(s => s.CurrentSeason)
            .FirstOrDefaultAsync();

        if (currentSeasonStr == null)
        {
            _logger.LogWarning("League settings not found for league {LeagueId}", leagueId);
            return;
        }

        int currentSeasonEndYear = ParseSeasonYear(currentSeasonStr);

        // Ensure picks exist for current season, next season, and the season after
        for (int i = 0; i < 3; i++)
        {
            int targetSeason = currentSeasonEndYear + i;
            await GeneratePicksForSeasonAsync(targetSeason, leagueId);
        }
    }

    public async Task<DraftPick?> AssignPlayerToPickAsync(int pickId, int playerId)
    {
        var pick = await _context.DraftPicks
            .Include(p => p.CurrentOwner)
            .Include(p => p.League)
                .ThenInclude(l => l.Settings)
            .FirstOrDefaultAsync(p => p.Id == pickId);

        if (pick == null)
        {
            _logger.LogWarning("Draft pick {PickId} not found", pickId);
            return null;
        }

        if (pick.PlayerId != null)
        {
            _logger.LogWarning("Draft pick {PickId} already has a player assigned", pickId);
            return null;
        }

        if (pick.SlotNumber == null)
        {
            _logger.LogWarning("Draft pick {PickId} does not have a slot number assigned", pickId);
            return null;
        }

        var player = await _context.Players.FindAsync(playerId);
        if (player == null)
        {
            _logger.LogWarning("Player {PlayerId} not found", playerId);
            return null;
        }

        // Assign player to pick
        pick.PlayerId = playerId;

        // Calculate rookie salary (Try DB first, then fallback to service)
        var dbScale = await _context.RookieWageScales
            .FirstOrDefaultAsync(s => s.LeagueId == pick.LeagueId && s.PickNumber == pick.SlotNumber);

        double salaryY1, salaryY2, salaryY3;

        if (dbScale != null)
        {
            salaryY1 = dbScale.Year1Salary;
            salaryY2 = dbScale.Year2Salary;
            salaryY3 = Math.Round(salaryY2 * (1 + (dbScale.Year3OptionPercentage / 100.0)), 2);
        }
        else
        {
            int maxSlots = pick.League.Settings?.NumberOfTeams ?? 12;
            maxSlots *= 2; // Total picks = teams * 2 rounds
            salaryY1 = _salaryScale.GetSalaryForSlot(pick.SlotNumber.Value, maxSlots);
            salaryY2 = salaryY1;
            salaryY3 = salaryY1;
        }

        // Create rookie contract (2+1 structure)
        var contract = new Contract
        {
            TeamId = pick.CurrentOwnerTeamId,
            PlayerId = playerId,
            SalaryYear1 = salaryY1,
            SalaryYear2 = salaryY2,
            SalaryYear3 = salaryY3,
            ContractYears = 3,
            IsRookieContract = true,
            IsYear3TeamOption = true,
            // Set option deadline to end of Year 2 (simplified - could be more sophisticated)
            OptionDeadline = DateTime.UtcNow.AddYears(2),
            OptionExercised = false
        };

        _context.Contracts.Add(contract);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Assigned player {PlayerId} to draft pick {PickId} (Slot {SlotNumber}) with rookie salary {Salary}",
            playerId, pickId, pick.SlotNumber, salaryY1);

        return pick;
    }

    private int ParseSeasonYear(string season)
    {
        return SeasonHelper.ParseStartYear(season);
    }
}
