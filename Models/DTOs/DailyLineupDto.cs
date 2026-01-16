namespace FantasyBasket.API.Models.Dto;

public class DailyLineupDto
{
    public int Id { get; set; } // ID della riga DailyLineup
    public int PlayerId { get; set; } // ID del Giocatore (Tabella Players)
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public bool IsStarter { get; set; }

    // Priorità Panchina
    public int BenchOrder { get; set; }
    // Info Partita
    public bool HasGame { get; set; }
    public string Opponent { get; set; } = string.Empty;
    public string GameTime { get; set; } = string.Empty; // Es: "19:00", "Live", "Final"

    public int? GamePoints { get; set; }
    public int? GameRebounds { get; set; }
    public int? GameAssists { get; set; }
    public int? GameSteals { get; set; }
    public int? GameBlocks { get; set; }
    public int? GameTurnovers { get; set; }
    public double? GameMinutes { get; set; }
    // Status
    public string? InjuryStatus { get; set; } // "Out", "Day-To-Day"
    public double? RealPoints { get; set; } // Punti fatti oggi (se la partita è iniziata)

    // --- STATISTICHE MEDIE (Popolate dalla tabella Players) ---
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }
    public double AvgFantasyPoints { get; set; }
}