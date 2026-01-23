using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class RookieWageScale
{
    [Key]
    public int Id { get; set; }

    public int LeagueId { get; set; }
    [ForeignKey("LeagueId")]
    public League League { get; set; } = default!;

    public int PickNumber { get; set; } // 1 to 60

    public double Year1Salary { get; set; }
    public double Year2Salary { get; set; }
    public double Year3OptionPercentage { get; set; } // e.g., 20 for 20% increase over Year 2
}
