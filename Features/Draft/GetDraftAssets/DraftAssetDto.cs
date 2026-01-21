namespace FantasyBasket.API.Features.Draft.GetDraftAssets;

public class DraftAssetDto
{
    public int Id { get; set; }
    public int Season { get; set; }
    public int Round { get; set; }
    public int? SlotNumber { get; set; }
    public int OriginalOwnerTeamId { get; set; }
    public string OriginalOwnerTeamName { get; set; } = string.Empty;
    public int CurrentOwnerTeamId { get; set; }
    public string CurrentOwnerTeamName { get; set; } = string.Empty;
    public bool IsOwn { get; set; } // CurrentOwner == OriginalOwner
    public int? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public int LeagueId { get; set; }
}
