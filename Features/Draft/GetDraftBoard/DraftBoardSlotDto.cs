namespace FantasyBasket.API.Features.Draft.GetDraftBoard;

public class DraftBoardSlotDto
{
    public int Id { get; set; }
    public int Season { get; set; }
    public int Round { get; set; }
    public int? SlotNumber { get; set; }
    public int OriginalOwnerTeamId { get; set; }
    public string OriginalOwnerTeamName { get; set; } = string.Empty;
    public int CurrentOwnerTeamId { get; set; }
    public string CurrentOwnerTeamName { get; set; } = string.Empty;
    public bool IsTradedPick { get; set; } // OriginalOwner != CurrentOwner
    public int? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public bool IsRevealed { get; set; } = true;
}
