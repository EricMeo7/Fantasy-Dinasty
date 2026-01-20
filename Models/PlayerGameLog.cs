public class PlayerGameLog
{
    public int Id { get; set; }
    public int PlayerId { get; set; } // FK Player
    public string GameDate { get; set; } = string.Empty; // Formato "YYYY-MM-DD"

    // Stats Reali
    public int Points { get; set; }
    public int Rebounds { get; set; }
    public int Assists { get; set; }
    public int Steals { get; set; }
    public int Blocks { get; set; }
    public int Turnovers { get; set; }
    public double Minutes { get; set; }

    // Advanced Details
    public int Fgm { get; set; }
    public int Fga { get; set; }
    public int Ftm { get; set; }
    public int Fta { get; set; }
    public int ThreePm { get; set; }
    public int ThreePa { get; set; }
    public int OffRebounds { get; set; }
    public int DefRebounds { get; set; }
    public bool Won { get; set; }
    // Punteggio Calcolato
    public double FantasyPoints { get; set; }
}