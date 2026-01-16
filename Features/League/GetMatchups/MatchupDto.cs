namespace FantasyBasket.API.Features.League.GetMatchups;

public class MatchupDto
{
    public int Id { get; set; }
    public int WeekNumber { get; set; }
    public bool IsPlayed { get; set; }
    
    // Squadra Casa
    public string HomeTeam { get; set; } = string.Empty;
    public int HomeTeamId { get; set; }
    public double HomeScore { get; set; }

    // Squadra Ospite
    public string AwayTeam { get; set; } = string.Empty;
    public int AwayTeamId { get; set; }
    public double AwayScore { get; set; }

    public bool IsBye { get; set; }
    
    public DateTime WeekStart { get; set; }
    public DateTime WeekEnd { get; set; }
}
