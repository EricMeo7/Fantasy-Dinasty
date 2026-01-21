using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class DraftPick
{
    [Key]
    public int Id { get; set; }

    public int Season { get; set; } // es. 2026
    public int Round { get; set; } // 1 o 2

    // Proprietario Originale (determina la posizione nella lottery)
    public int OriginalOwnerTeamId { get; set; }
    [ForeignKey("OriginalOwnerTeamId")]
    public Team OriginalOwner { get; set; } = default!;

    // Proprietario Attuale (può cambiare tramite trade)
    public int CurrentOwnerTeamId { get; set; }
    [ForeignKey("CurrentOwnerTeamId")]
    public Team CurrentOwner { get; set; } = default!;

    // Assegnato dopo la lottery
    public int? SlotNumber { get; set; }
    
    public bool IsRevealed { get; set; } = true;

    // Assegnato durante il draft
    public int? PlayerId { get; set; }
    [ForeignKey("PlayerId")]
    public Player? Player { get; set; }

    public int LeagueId { get; set; }
    [ForeignKey("LeagueId")]
    public League League { get; set; } = default!;
}
