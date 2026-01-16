using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.Models;

public enum TradeStatus { Pending, Accepted, Rejected, Cancelled }

public class Trade
{
    public int Id { get; set; }
    public int LeagueId { get; set; }
    public string ProposerId { get; set; } = string.Empty;
    public TradeStatus Status { get; set; } = TradeStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<TradeOffer> Offers { get; set; } = new();

    // NUOVO: Lista di chi ha già accettato
    public List<TradeAcceptance> Acceptances { get; set; } = new();
}

public class TradeOffer
{
    public int Id { get; set; }
    public int TradeId { get; set; }
    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public int PlayerId { get; set; }
    public Player? Player { get; set; }
}

// NUOVA CLASSE
public class TradeAcceptance
{
    public int Id { get; set; }
    public int TradeId { get; set; }
    public string UserId { get; set; } = string.Empty; // Chi ha messo "Accetta"
    public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;
}