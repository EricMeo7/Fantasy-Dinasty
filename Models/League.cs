using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.Models;

public class League
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string InvitationCode { get; set; } = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

    public double SalaryCap { get; set; } = 200.0;
    public LeagueState Status { get; set; } = LeagueState.DraftMode;
    public string CurrentSeason { get; set; } = "2025-26";

    public DateTime? SeasonStartDate { get; set; }
    // --- ADD THIS PROPERTY ---
    public double MinBidAmount { get; set; } = 1.0;
    
    // Logo Storage
    public byte[]? LogoData { get; set; }
    public string? LogoContentType { get; set; }
    // -------------------------

    public LeagueSettings? Settings { get; set; } // Navigator
    
    public List<Team> Teams { get; set; } = new();
}