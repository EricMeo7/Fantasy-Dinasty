using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.Models;

// 1. DEFINIZIONE ENUM (Deve essere fuori dalla classe, ma dentro il namespace)
public enum LeagueState
{
    OffSeason = 0,   // Tutto fermo
    DraftMode = 1,   // Asta Live attiva, Mercato FA bloccato
    InSeason = 2,    // Mercato FA aperto, Asta Live chiusa
    Playoffs = 3     // Mercato bloccato (opzionale)
}

// 2. CLASSE SETTINGS
public class LeagueSettings
{
    [Key]
    public int Id { get; set; }
    
    // FK 1:1 con League
    public int LeagueId { get; set; }
    [System.Text.Json.Serialization.JsonIgnore]
    public League? League { get; set; }

    public string CurrentSeason { get; set; } = "2025-26";
    public int PlayoffTeams { get; set; } = 4; // 2 East + 2 West

    // Regole economiche
    public double SalaryCap { get; set; } = 200.0;
    public double SalaryFloor { get; set; } = 160.0;
    public double MinBidAmount { get; set; } = 1.0;
    
    // Scoring System (Default Weights)
    public double PointWeight { get; set; } = 1.0;
    public double ReboundWeight { get; set; } = 1.2;
    public double AssistWeight { get; set; } = 1.5;
    public double StealWeight { get; set; } = 3.0;
    public double BlockWeight { get; set; } = 3.0;
    public double TurnoverWeight { get; set; } = -1.0;

    // Roster Configuration
    public int RosterSlotsPG { get; set; } = 1;
    public int RosterSlotsSG { get; set; } = 1;
    public int RosterSlotsSF { get; set; } = 1;
    public int RosterSlotsPF { get; set; } = 1;
    public int RosterSlotsC { get; set; } = 1;
    public int RosterSlotsG { get; set; } = 0;
    public int RosterSlotsF { get; set; } = 0;
    public int RosterSlotsUtil { get; set; } = 0;
    public int RosterSlotsBench { get; set; } = 5;
    public int RosterSlotsIR { get; set; } = 1;

    // Schedule
    public DateTime? SeasonStartDate { get; set; }
    public DateTime? SeasonEndDate { get; set; }

    // Stato della lega
    public LeagueState Status { get; set; } = LeagueState.DraftMode;
}