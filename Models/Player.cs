using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class Player
{
    [Key]
    public int Id { get; set; }

    // ID ufficiale NBA (usato per scaricare le foto e sync)
    public int ExternalId { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty; // Es. "LAL", "BOS"

    public string Height { get; set; } = string.Empty;
    public string Weight { get; set; } = string.Empty;

    // --- STATS MEDIE STAGIONALI (Aggiornate dal Job Notturno) ---
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }
    public double AvgSteals { get; set; }
    public double AvgBlocks { get; set; }

    // --- DETTAGLIO TIRO ---
    public double Fgm { get; set; }
    public double Fga { get; set; }
    public double FgPercent { get; set; }

    public double ThreePm { get; set; }
    public double ThreePa { get; set; }
    public double ThreePtPercent { get; set; }

    public double Ftm { get; set; }
    public double Fta { get; set; }
    public double FtPercent { get; set; }

    // --- DETTAGLIO RIMBALZI ---
    public double OffRebounds { get; set; }
    public double DefRebounds { get; set; }

    // --- STATS AVANZATE & IMPATTO ---
    public double AvgMinutes { get; set; }
    public double AvgTurnovers { get; set; }
    public double PersonalFouls { get; set; }
    public double PlusMinus { get; set; }

    public double Efficiency { get; set; }
    public double WinPct { get; set; }
    public double DoubleDoubles { get; set; }
    public double TripleDoubles { get; set; }

    // Punteggio Fanta medio (usato per base d'asta e ordinamenti)
    public double FantasyPoints { get; set; }
    public int GamesPlayed { get; set; }

    public string? InjuryStatus { get; set; } // "Active", "Out", "Day-To-Day"
    public string? InjuryBodyPart { get; set; } // Es. "Ankle"
    public string? InjuryReturnDate { get; set; } // Es. "Mid Dec" o "TBD"
    // Relazione con lo storico delle stagioni passate
    public List<PlayerSeasonStat> SeasonStats { get; set; } = new();

    // NOTA: Rimossi OwnerUserId, Salary, ContractYears, IsStarter.
    // Quei dati ora si trovano nella tabella "Contracts".
}