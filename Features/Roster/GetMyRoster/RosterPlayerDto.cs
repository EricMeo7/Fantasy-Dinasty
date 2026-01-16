namespace FantasyBasket.API.Features.Roster.GetMyRoster;

public class RosterPlayerDto
{
    // Dati Giocatore
    public int Id { get; set; }
    public int ExternalId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }

    // Dati Contratto
    public bool IsStarter { get; set; }
    public double SalaryYear1 { get; set; }
    public double SalaryYear2 { get; set; }
    public double SalaryYear3 { get; set; }
    public int ContractYears { get; set; }

    // Dati Infortunio
    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
    public string? InjuryReturnDate { get; set; }
}
