using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class DailyLineup
{
    public int Id { get; set; }

    public int LeagueId { get; set; } // Mantenuto come richiesto

    public int TeamId { get; set; }
    [ForeignKey("TeamId")]
    public virtual Team? Team { get; set; } // Navigazione verso il Team

    public int PlayerId { get; set; }
    [ForeignKey("PlayerId")]
    public virtual Player? Player { get; set; } // <<< FONDAMENTALE: Navigazione verso il Player

    public DateTime Date { get; set; }

    public bool IsStarter { get; set; }

    public string Slot { get; set; } = string.Empty; // Es. "PG", "C", "BN"
    public int BenchOrder { get; set; } = 0;
}