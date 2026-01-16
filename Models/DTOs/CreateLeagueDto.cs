using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.Models.Dto;

public class CreateLeagueDto
{
    [Required]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Il nome della lega deve essere tra 3 e 50 caratteri.")]
    public string LeagueName { get; set; } = string.Empty;

    [Required]
    [StringLength(30, MinimumLength = 3, ErrorMessage = "Il nome della squadra deve essere tra 3 e 30 caratteri.")]
    public string MyTeamName { get; set; } = string.Empty;
}

public class JoinLeagueDto
{
    [Required]
    public string Code { get; set; } = string.Empty; // Il codice invito (es. "A1B2C3D4")

    [Required]
    [StringLength(30, MinimumLength = 3, ErrorMessage = "Il nome della squadra deve essere tra 3 e 30 caratteri.")]
    public string MyTeamName { get; set; } = string.Empty;
}