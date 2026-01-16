using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.Contracts;

namespace FantasyBasket.API.Models;

public class Team
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty; // Nome Fantasquadra (es. "Milano Bulls")

    public bool IsAdmin { get; set; } = false; // Se è il commissioner DI QUESTA lega

    // Collegamenti
    public required string UserId { get; set; } // Chi possiede questo team
    [ForeignKey("UserId")]
    public ApplicationUser User { get; set; } = default!;

    public int LeagueId { get; set; }
    [ForeignKey("LeagueId")]
    public League League { get; set; } = default!;

    // Budget residuo (opzionale, o calcolato dinamicamente)
    // public double RemainingBudget { get; set; } 

    public List<Contract> Roster { get; set; } = new();
    public Division Division { get; set; } = Division.None;
}

public enum Division
{
    None = 0,
    East = 1,
    West = 2
}