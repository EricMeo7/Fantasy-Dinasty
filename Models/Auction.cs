using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography;

namespace FantasyBasket.API.Models;

public class Auction
{
    [Key]
    public int Id { get; set; }

    public int PlayerId { get; set; }
    [ForeignKey("PlayerId")]
    public Player Player { get; set; } = default!;

    // Dati dell'offerta vincente attuale
    public string? HighBidderId { get; set; } // User ID del vincente attuale
    public double CurrentOfferTotal { get; set; } // Totale offerta (es. 74)
    public int CurrentOfferYears { get; set; } // Anni (es. 3)

    // Valori calcolati per confronto rapido
    public double CurrentYear1Amount { get; set; } // Es. 24 (per confronto)
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; } // Quando scade l'asta
    public bool IsActive { get; set; } = true;

    public int LeagueId { get; set; }

    // Storico rilanci (Opzionale, utile per log)
    public List<Bid> Bids { get; set; } = new();
}