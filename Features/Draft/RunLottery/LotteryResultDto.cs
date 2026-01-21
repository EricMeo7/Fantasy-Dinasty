namespace FantasyBasket.API.Features.Draft.RunLottery;

public class LotteryResultDto
{
    public int PickId { get; set; }
    public int SlotNumber { get; set; }
    public string OriginalOwnerTeamName { get; set; } = string.Empty;
    public string CurrentOwnerTeamName { get; set; } = string.Empty;
    public int Round { get; set; }
}
