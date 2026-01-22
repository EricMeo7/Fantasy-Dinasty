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
        // Get league settings to determine number of teams
        var leagueSettings = await _context.LeagueSettings
            .FirstOrDefaultAsync(s => s.LeagueId == leagueId);

        if (leagueSettings == null)
        {
            _logger.LogWarning("League settings not found for league {LeagueId}", leagueId);
            return;
        }

        int numberOfTeams = leagueSettings.NumberOfTeams;

        // Get all teams in this league
        var teams = await _context.Teams
            .Where(t => t.LeagueId == leagueId)
            .OrderBy(t => t.Id)
            .ToListAsync();

        if (teams.Count == 0)
        {
            _logger.LogWarning("No teams found for league {LeagueId}", leagueId);
            return;
        }

        // Generate picks for Round 1 and Round 2
        for (int round = 1; round <= 2; round++)
        {
            foreach (var team in teams)
            {
                // Check if pick already exists (prevent duplicates)
                bool pickExists = await _context.DraftPicks
                    .AnyAsync(p => p.LeagueId == leagueId &&
                                   p.Season == season &&
                                   p.Round == round &&
                                   p.OriginalOwnerTeamId == team.Id);

                if (!pickExists)
                {
                    var draftPick = new DraftPick
                    {
                        Season = season,
                        Round = round,
                        OriginalOwnerTeamId = team.Id,
                        CurrentOwnerTeamId = team.Id, // Initially owned by original team
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
            teams.Count * 2, season, leagueId);
    }

    public async Task EnsurePicksFor3SeasonsAsync(int leagueId)
    {
        // Get current season from league settings
        var leagueSettings = await _context.LeagueSettings
            .FirstOrDefaultAsync(s => s.LeagueId == leagueId);

        if (leagueSettings == null)
        {
            _logger.LogWarning("League settings not found for league {LeagueId}", leagueId);
            return;
        }

        // Parse current season (e.g., "2025-26" -> 2026)
        int currentSeasonEndYear = ParseSeasonYear(leagueSettings.CurrentSeason);

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

        // Calculate rookie salary based on slot number
        int maxSlots = pick.League.Settings?.NumberOfTeams ?? 12;
        maxSlots *= 2; // Total picks = teams * 2 rounds
        double rookieSalary = _salaryScale.GetSalaryForSlot(pick.SlotNumber.Value, maxSlots);

        // Create rookie contract (2+1 structure)
        var contract = new Contract
        {
            TeamId = pick.CurrentOwnerTeamId,
            PlayerId = playerId,
            SalaryYear1 = rookieSalary,
            SalaryYear2 = rookieSalary,
            SalaryYear3 = rookieSalary,
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
            playerId, pickId, pick.SlotNumber, rookieSalary);

        return pick;
    }

    private int ParseSeasonYear(string season)
    {
        // Parse "2025-26" -> 2026
        var parts = season.Split('-');
        if (parts.Length == 2 && int.TryParse("20" + parts[1], out int year))
        {
            return year;
        }

        // Fallback to current year
        return DateTime.UtcNow.Year;
    }
}
