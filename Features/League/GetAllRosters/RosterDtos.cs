namespace FantasyBasket.API.Features.League.GetAllRosters;

public class TeamRosterDto
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public List<PlayerRosterDto> Players { get; set; } = new();
}

public class PlayerRosterDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int ExternalId { get; set; }
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public double AvgPoints { get; set; }
    public double SalaryYear1 { get; set; }
    public double SalaryYear2 { get; set; }
    public double SalaryYear3 { get; set; }
    public int ContractYears { get; set; }
    public bool IsStarter { get; set; }
    public string? InjuryStatus { get; set; }
    public string? InjuryBodyPart { get; set; }
}
