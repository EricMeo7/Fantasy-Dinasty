namespace FantasyBasket.API.Features.League.GetMatchDetails;

public class MatchDetailsResponseDto
{
    public int Id { get; set; }
    public int LeagueId { get; set; }
    public int WeekNumber { get; set; }
    public DateTime WeekStartDate { get; set; }
    public DateTime WeekEndDate { get; set; }
    public bool IsPlayed { get; set; }

    public string HomeTeam { get; set; } = string.Empty;
    public int HomeTeamId { get; set; }
    public string HomeUserId { get; set; } = string.Empty;
    public double HomeScore { get; set; }
    public List<MatchPlayerDto> HomePlayers { get; set; } = new();

    public string AwayTeam { get; set; } = string.Empty;
    public int AwayTeamId { get; set; }
    public string AwayUserId { get; set; } = string.Empty;
    public double AwayScore { get; set; }
    public List<MatchPlayerDto> AwayPlayers { get; set; } = new();
}

public class MatchPlayerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public double TodayScore { get; set; }
    public double WeeklyScore { get; set; }
    public string Status { get; set; } = "Active";
}
