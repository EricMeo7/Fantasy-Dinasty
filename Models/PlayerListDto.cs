using System;

namespace FantasyBasket.API.Models;

public class PlayerListDto
{
    public int Id { get; set; }
    public int ExternalId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;

    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }

    public bool IsStarter { get; set; }

    // --- NUOVI CAMPI ASTA ---
    public bool HasActiveAuction { get; set; }     // C'è un'asta in corso?
    public DateTime? AuctionEndTime { get; set; }  // Quando scade
    public double CurrentOffer { get; set; }       // Quanto è l'offerta (es. 75)
    public int CurrentYears { get; set; }          // Durata (es. 3)
    public string HighBidderName { get; set; } = string.Empty; // Nome squadra che sta vincendo

    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
}