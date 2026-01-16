namespace FantasyBasket.API.Models.DTOs;

public class LeagueStandingDto
{
    public string FantasyTeamName { get; set; } = string.Empty;
    public string GeneralManagerName { get; set; } = string.Empty;
    public bool IsMe { get; set; }
    public bool IsAdmin { get; set; }
    public string TeamId { get; set; } = string.Empty;

    // Nuove Stats
    public int GamesPlayed { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public double TotalPoints { get; set; }

    // Calcolate
    public double AvgPoints => GamesPlayed > 0 ? Math.Round(TotalPoints / GamesPlayed, 1) : 0;
    public double WinPercentage => GamesPlayed > 0 ? Math.Round((double)Wins / GamesPlayed * 100, 1) : 0;
}