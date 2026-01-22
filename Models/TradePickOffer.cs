using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyBasket.API.Models;

public class TradePickOffer
{
    [Key]
    public int Id { get; set; }

    public int TradeId { get; set; }
    [ForeignKey("TradeId")]
    public Trade Trade { get; set; } = default!;

    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;

    public int DraftPickId { get; set; }
    [ForeignKey("DraftPickId")]
    public DraftPick DraftPick { get; set; } = default!;
}
