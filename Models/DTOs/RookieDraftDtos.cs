using System;

namespace FantasyBasket.API.Models.DTOs;

public class RookieDraftDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string NbaTeam { get; set; } = string.Empty;
    public int ExternalId { get; set; }
    public int? RealRank { get; set; }
}

public class CurrentPickDto
{
    public int Id { get; set; }
    public int Round { get; set; }
    public int PickNumber { get; set; } // Overall pick number
    public int TeamId { get; set; } 
    public string TeamName { get; set; } = string.Empty;
    public string TeamLogoUrl { get; set; } = string.Empty;
    public DateTime? Deadline { get; set; }
}

public class RookieDraftStateDto
{
    public int LeagueId { get; set; }
    public bool IsActive { get; set; }
    public bool IsPaused { get; set; }
    public CurrentPickDto? CurrentPick { get; set; }
    public List<CurrentPickDto> UpcomingPicks { get; set; } = new();
    public List<CurrentPickDto> RecentHistory { get; set; } = new(); // Last 3 picks
    
    // Supporto for Lobby / Waiting Room
    public List<FantasyBasket.API.Models.Dto.TeamDraftSummaryDto> Teams { get; set; } = new();
    public List<string> OnlineParticipants { get; set; } = new();
}

public class PlayerPickedDto
{
    public int PickId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int TeamId { get; set; }
    public double SalaryY1 { get; set; }
    public double SalaryY2 { get; set; }
    public double SalaryY3 { get; set; }
    public CurrentPickDto? NextPick { get; set; } // Minimal next pick info
}

public class TeamBudgetDeltaDto
{
    public string U { get; set; } = string.Empty; // UserId (Minified key)
    public double B { get; set; } // RemainingBudget
    public int R { get; set; } // RosterCount
}

public class DraftSidebarUpdateDto
{
    public List<TeamBudgetDeltaDto> Deltas { get; set; } = new();
}
