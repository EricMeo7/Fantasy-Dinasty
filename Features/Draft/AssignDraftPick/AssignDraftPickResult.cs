namespace FantasyBasket.API.Features.Draft.AssignDraftPick;

public class AssignDraftPickResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? ContractId { get; set; }
    public double? RookieSalary { get; set; }
}
