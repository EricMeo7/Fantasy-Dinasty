using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class TeamDeadCap
{
    [Key]
    public int Id { get; set; }

    public string TeamId { get; set; } = string.Empty; // L'ID dell'utente (ApplicationUser)

    public string Season { get; set; } = string.Empty; // Su quale stagione pesa (es. "2025-26")
    public double Amount { get; set; } // Quanto pesa (es. 1.5)

    public string Reason { get; set; } = string.Empty; // Es. "Taglio Tobias Harris"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int LeagueId { get; set; }
}