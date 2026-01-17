using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.Models.Dto;

public class UpdateLeagueDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
}

public class UpdateTeamDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
}
