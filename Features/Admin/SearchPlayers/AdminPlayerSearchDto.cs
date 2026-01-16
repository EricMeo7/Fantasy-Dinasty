namespace FantasyBasket.API.Features.Admin.SearchPlayers;

public class AdminPlayerSearchDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string? CurrentOwner { get; set; }
}
