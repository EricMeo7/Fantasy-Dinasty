namespace FantasyBasket.API.Features.Lineup.GetLineup;

public class DailyLineupDto
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public int? ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public bool IsStarter { get; set; }
    public string? Slot { get; set; } // Critical for explicit assignment
    public int BenchOrder { get; set; }
    
    // Game Info
    public bool HasGame { get; set; }
    public string Opponent { get; set; } = string.Empty;
    public string GameTime { get; set; } = string.Empty;
    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }

    // Live Stats (Null if not started)
    public double? RealPoints { get; set; }
    public int? GamePoints { get; set; }
    public int? GameRebounds { get; set; }
    public int? GameAssists { get; set; }
    public int? GameSteals { get; set; }
    public int? GameBlocks { get; set; }
    public int? GameTurnovers { get; set; }
    public string? GameMinutes { get; set; }
    
    // Best Ball Logic
    public double? WeeklyBestScore { get; set; }

    // Season Averages
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }
    public double AvgFantasyPoints { get; set; }
}
