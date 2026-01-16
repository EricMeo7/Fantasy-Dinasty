using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class Contract
{
    [Key]
    public int Id { get; set; }

    public int TeamId { get; set; }
    [ForeignKey("TeamId")]
    public Team Team { get; set; } = default!;

    public int PlayerId { get; set; } // Riferimento al giocatore NBA reale
    [ForeignKey("PlayerId")]
    public Player Player { get; set; } = default!;

    // Dettagli contratto specifici per QUESTA lega
    public double SalaryYear1 { get; set; }
    public double SalaryYear2 { get; set; }
    public double SalaryYear3 { get; set; }
    public int ContractYears { get; set; }
    // NOTA: IsStarter rimosso - ora esiste solo in DailyLineup
}