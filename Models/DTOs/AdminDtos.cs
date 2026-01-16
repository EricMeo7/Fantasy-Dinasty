namespace FantasyBasket.API.Models.Dto;

public class ManualAssignDto
{
    public int PlayerId { get; set; }
    public string TargetUserId { get; set; } = string.Empty; // A chi lo diamo
    public double Salary { get; set; }
    public int Years { get; set; }
}