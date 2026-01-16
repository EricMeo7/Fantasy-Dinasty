using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class Matchup
{
    [Key]
    public int Id { get; set; }

    public int LeagueId { get; set; }

    // Numero della giornata (1, 2, 3...)
    public int WeekNumber { get; set; }

    // Squadra Casa
    public string? HomeTeamId { get; set; }
    [ForeignKey("HomeTeamId")]
    public ApplicationUser? HomeTeam { get; set; }
    public string? HomeTeamPlaceholder { get; set; }

    // Squadra Trasferta
    public string? AwayTeamId { get; set; }
    [ForeignKey("AwayTeamId")]
    public ApplicationUser? AwayTeam { get; set; }
    public string? AwayTeamPlaceholder { get; set; }

    // Punteggi
    public double HomeScore { get; set; }
    public double AwayScore { get; set; }

    // Stato partita
    public bool IsPlayed { get; set; } = false;
    public FantasyBasket.API.Models.MatchType Type { get; set; } = FantasyBasket.API.Models.MatchType.RegularSeason;

    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
}

public enum MatchType
{
    RegularSeason = 0,
    PlayoffQuarterFinal = 1,
    PlayoffSemiFinal = 2,
    PlayoffFinal = 3, // Conference Final
    NbaFinal = 4      // League Final
}

public enum ScheduleMode
{
    Weekly = 0,    // Standard 7 days (Mon-Sun)
    SplitWeek = 1, // Mon-Thu / Fri-Sun
    Daily = 2      // Single Day (only if games exist)
}