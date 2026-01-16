using FantasyBasket.API.Models;

namespace FantasyBasket.API.Features.League.GetLeagueDetails;

public class LeagueDetailsDto
{
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public List<LeagueStandingDto> Standings { get; set; } = new();
}

public class LeagueStandingDto
{
    public int TeamId { get; set; }
    public string FantasyTeamName { get; set; } = string.Empty;
    public string GeneralManagerName { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public bool IsMe { get; set; }
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public double TotalPoints { get; set; }
    public double WinPercentage => GamesPlayed > 0 ? (double)Wins / GamesPlayed : 0;
    public Division Division { get; set; }
}
