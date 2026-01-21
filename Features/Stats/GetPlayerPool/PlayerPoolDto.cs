namespace FantasyBasket.API.Features.Stats.GetPlayerPool;

public class PlayerPoolDto
{
    public int PlayerId { get; set; }
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string? FantasyTeamName { get; set; } // Null if Free Agent
    public int? FantasyTeamId { get; set; }

    // Stats - Shooting
    public double Fgm { get; set; }
    public double Fga { get; set; }
    public double FgPercent { get; set; }
    public double ThreePm { get; set; }
    public double ThreePa { get; set; }
    public double ThreePtPercent { get; set; }
    public double Ftm { get; set; }
    public double Fta { get; set; }
    public double FtPercent { get; set; }

    // Stats - Rebounds
    public double OffRebounds { get; set; }
    public double DefRebounds { get; set; }
    public double AvgRebounds { get; set; }

    // Stats - Others
    public double AvgPoints { get; set; }
    public double AvgAssists { get; set; }
    public double AvgSteals { get; set; }
    public double AvgBlocks { get; set; }
    public double AvgTurnovers { get; set; }
    public double GamesPlayed { get; set; }
    public double AvgMinutes { get; set; }
    public double FantasyPoints { get; set; }

    // Advanced
    public double PlusMinus { get; set; }
    public double Efficiency { get; set; }
    public double WinPct { get; set; }
    public double DoubleDoubles { get; set; }
    public double TripleDoubles { get; set; }

    // Injury
    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
    public string? InjuryReturnDate { get; set; }
}
