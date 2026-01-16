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

    // Stats Avanzate
    public int GamesPlayed { get; set; }
    public double AvgMinutes { get; set; }
    public double FgPercent { get; set; }
    public double ThreePtPercent { get; set; }
    public double FtPercent { get; set; }
    public double AvgTurnovers { get; set; }
    public double FantasyPoints { get; set; }
}