namespace FantasyBasket.API.Features.League.GetMyLeagues;

public class LeagueListDto
{
    public int LeagueId { get; set; }
    public string LeagueName { get; set; } = string.Empty;
    public string MyTeamName { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public int LogoVersion { get; set; }
}
