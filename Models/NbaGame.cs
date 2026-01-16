public class NbaGame
{
    public int Id { get; set; }
    public string NbaGameId { get; set; } = string.Empty;
    public DateTime GameDate { get; set; } // Solo data
    public string GameTime { get; set; } = string.Empty; // Es: "7:00 pm ET" (Indispensabile per lock esatto)
    public string HomeTeam { get; set; } = string.Empty; // Es: "LAL"
    public string AwayTeam { get; set; } = string.Empty; // Es: "BOS"
    public string Status { get; set; } = "Scheduled"; // Scheduled, Live, Final
}