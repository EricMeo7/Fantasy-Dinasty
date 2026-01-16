namespace FantasyBasket.API.Models.Dto;

public class TeamDraftSummaryDto
{
    public string UserId { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public double RemainingBudget { get; set; }
    public int RosterCount { get; set; }
    public List<string> Players { get; set; } = new(); // Lista nomi giocatori presi
}