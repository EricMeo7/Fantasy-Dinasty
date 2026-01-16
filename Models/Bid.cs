using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace FantasyBasket.API.Models;

public class Bid
{
    [Key]
    public int Id { get; set; }

    public int AuctionId { get; set; }
    [ForeignKey("AuctionId")]
    [JsonIgnore] // Evita cicli infiniti nel JSON
    public Auction Auction { get; set; } = default!;
    public string BidderId { get; set; } = default!; // Chi ha fatto l'offerta

    public double TotalAmount { get; set; }
    public int Years { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public int LeagueId { get; set; }
}