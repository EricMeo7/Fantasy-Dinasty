using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class PlayerSeasonStat
{
    [Key]
    public int Id { get; set; }

    public int PlayerId { get; set; }
    [ForeignKey("PlayerId")]
    public Player? Player { get; set; }

    public string Season { get; set; } = string.Empty; // Es. "2023-24"
    public string NbaTeam { get; set; } = string.Empty;

    // Stats Base
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }
    public double AvgSteals { get; set; }
    public double AvgBlocks { get; set; }
    
    // Shooting Details
    public double Fgm { get; set; }
    public double Fga { get; set; }
    public double FgPercent { get; set; }
    
    public double ThreePm { get; set; }
    public double ThreePa { get; set; }
    public double ThreePtPercent { get; set; }
    
    public double Ftm { get; set; }
    public double Fta { get; set; }
    public double FtPercent { get; set; }
    
    // Rebound Details
    public double OffRebounds { get; set; }
    public double DefRebounds { get; set; }

    // Advanced Stats
    public int GamesPlayed { get; set; }
    public double AvgMinutes { get; set; }
    public double AvgTurnovers { get; set; }
    public double PersonalFouls { get; set; }
    public double PlusMinus { get; set; }
    
    public double Efficiency { get; set; }
    public double WinPct { get; set; }
    public double DoubleDoubles { get; set; }
    public double TripleDoubles { get; set; }
    
    public double FantasyPoints { get; set; }
}