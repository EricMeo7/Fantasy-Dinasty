namespace FantasyBasket.API.Models.Dto;

public class MatchDetailDto
{
    public int Id { get; set; }
    public int WeekNumber { get; set; }
    public DateTime WeekStartDate { get; set; }

    // ID NUMERICI (Team.Id) - Fondamentali per il LineupController
    public int HomeTeamId { get; set; }
    public int AwayTeamId { get; set; }

    // Nomi
    public string HomeTeam { get; set; } = string.Empty;
    public string AwayTeam { get; set; } = string.Empty;

    // Punteggi
    public double HomeScore { get; set; }
    public double AwayScore { get; set; }
    public bool IsPlayed { get; set; }
}