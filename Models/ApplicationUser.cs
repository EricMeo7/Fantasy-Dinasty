using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class ApplicationUser : IdentityUser
{
    // Nome del General Manager (es. "Phil Jackson") - Usato come default
    public string? GeneralManagerName { get; set; }

    // Nome della squadra "Brand" (es. "Prato Hornets") - Usato come default
    public string? FantasyTeamName { get; set; }

    // Data di creazione account
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Statistica globale carriera (Opzionale: somma di tutti i punti in tutte le leghe)
    public double TotalCareerFantasyPoints { get; set; } = 0;

    // NOTA: Rimossi LeagueId, IsAdmin, Players.
    // - L'utente può avere tante squadre (Tabella Teams).
    // - L'utente è Admin dentro la tabella Teams (IsAdmin è specifico per lega).
    // - I giocatori posseduti sono nella tabella Contracts collegata a Teams.
}