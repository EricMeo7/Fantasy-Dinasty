namespace FantasyBasket.API.Models.Dto;

public class SeasonBudgetDto
{
    public string Season { get; set; } = string.Empty;
    public double TotalCap { get; set; }
    public double Contracts { get; set; }  // Stipendi attivi
    public double DeadMoney { get; set; }  // Penalità
    public double FreeSpace => TotalCap - (Contracts + DeadMoney);
}

public class DeadCapDetailDto
{
    public string PlayerName { get; set; } = string.Empty; // Estratto dal Reason
    public string Season { get; set; } = string.Empty;
    public double Amount { get; set; }
}

public class TeamFinanceOverviewDto
{
    public List<SeasonBudgetDto> Years { get; set; } = new();
    public List<DeadCapDetailDto> DeadCapDetails { get; set; } = new();
}