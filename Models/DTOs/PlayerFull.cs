namespace FantasyBasket.API.Models.Dto;

public class PlayerFull
{
    public int Id { get; set; }
    public int ExternalId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;

    // Stats
    public double AvgPoints { get; set; }
    public double AvgRebounds { get; set; }
    public double AvgAssists { get; set; }

    // Dati Contratto (Specifici per la lega)
    public bool IsStarter { get; set; }
    public double SalaryYear1 { get; set; }
    public double SalaryYear2 { get; set; }
    public double SalaryYear3 { get; set; }
    public int ContractYears { get; set; }

    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
}