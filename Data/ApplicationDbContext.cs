using FantasyBasket.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Tabella dei giocatori
    public DbSet<Player> Players { get; set; }
    public DbSet<League> Leagues { get; set; }
    public DbSet<Matchup> Matchups { get; set; }
    public DbSet<PlayerSeasonStat> PlayerSeasonStats { get; set; }
    public DbSet<TeamDeadCap> DeadCaps { get; set; }
    public DbSet<Auction> Auctions { get; set; }
    public DbSet<Bid> Bids { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<Contract> Contracts { get; set; }
    public DbSet<Trade> Trades { get; set; }
    public DbSet<TradeOffer> TradeOffers { get; set; }
    public DbSet<TradeAcceptance> TradeAcceptances { get; set; }
    public DbSet<PlayerGameLog> PlayerGameLogs { get; set; }
    public DbSet<DailyLineup> DailyLineups { get; set; }
    public DbSet<NbaGame> NbaGames { get; set; }
    public DbSet<LeagueSettings> LeagueSettings { get; set; } // New DbSet
    public DbSet<DraftPick> DraftPicks { get; set; }
    public DbSet<TradePickOffer> TradePickOffers { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configurazione relazione One-to-One League <-> LeagueSettings
        builder.Entity<League>()
            .HasOne(l => l.Settings)
            .WithOne(s => s.League)
            .HasForeignKey<LeagueSettings>(s => s.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);


        // Configurazione relazione:
        
        // Indice per velocizzare la ricerca per ID esterno
        builder.Entity<Player>()
            .HasIndex(p => p.ExternalId)
            .IsUnique();

        builder.Entity<League>()
            .HasIndex(l => l.InvitationCode)
            .IsUnique();

        builder.Entity<Matchup>()
        .HasOne(m => m.HomeTeam)
        .WithMany()
        .HasForeignKey(m => m.HomeTeamId)
        .OnDelete(DeleteBehavior.Restrict); // Importante per SQL Server

        builder.Entity<Matchup>()
            .HasOne(m => m.AwayTeam)
            .WithMany()
            .HasForeignKey(m => m.AwayTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Contract>()
           .HasOne(c => c.Team)
           .WithMany(t => t.Roster)
           .HasForeignKey(c => c.TeamId);

        // Optimization Index for Game Logs
        builder.Entity<PlayerGameLog>()
            .HasIndex(l => new { l.GameDate, l.PlayerId });

        // --- PERFORMANCE INDEXES (ADDED AFTER LOG ANALYSIS) ---
        
        // 1. Contracts Query (25s latency)
        // SELECT ... FROM Contracts WHERE TeamId = ...
        builder.Entity<Contract>()
            .HasIndex(c => c.TeamId);
        
        builder.Entity<Contract>()
            .HasIndex(c => c.PlayerId);

        // 2. Teams Query
        // SELECT ... FROM Teams WHERE UserId = ... AND LeagueId = ...
        builder.Entity<Team>()
            .HasIndex(t => new { t.UserId, t.LeagueId });

        // 3. Matchups Query (25s latency)
        // WHERE LeagueId = ... AND IsPlayed = 0 AND (HomeTeamId = ... OR AwayTeamId = ...)
        builder.Entity<Matchup>()
            .HasIndex(m => new { m.LeagueId, m.IsPlayed, m.WeekNumber });
        builder.Entity<Matchup>()
            .HasIndex(m => m.HomeTeamId);
        builder.Entity<Matchup>()
            .HasIndex(m => m.AwayTeamId);

        // 4. Trades Query (25s latency)
        // WHERE LeagueId = ... AND Status = 0 ...
        builder.Entity<Trade>()
            .HasIndex(t => new { t.LeagueId, t.Status });
        
        builder.Entity<TradeOffer>()
            .HasIndex(t => t.TradeId);
        builder.Entity<TradeOffer>()
            .HasIndex(t => t.ToUserId);
        builder.Entity<TradeOffer>()
            .HasIndex(t => t.FromUserId);

        // 5. DailyLineups
        builder.Entity<DailyLineup>()
            .HasIndex(d => new { d.TeamId, d.Date });

        // 6. Market / Free Agents
        builder.Entity<Player>()
            .HasIndex(p => p.AvgPoints); // Ideally Descending but FluentAPI defaults to Asc usually. DB will handle it.
            
        builder.Entity<Auction>()
            .HasIndex(a => new { a.LeagueId, a.IsActive });

        // 7. Player Season Stats
        builder.Entity<PlayerSeasonStat>()
            .HasIndex(s => new { s.PlayerId, s.Season });
        
        // 8. Player Search Optimization
        builder.Entity<Player>()
            .HasIndex(p => p.LastName);
        builder.Entity<Player>()
            .HasIndex(p => p.FirstName);

        // 9. Draft Picks System
        builder.Entity<DraftPick>()
            .HasIndex(d => new { d.LeagueId, d.Season, d.Round });
        builder.Entity<DraftPick>()
            .HasIndex(d => d.CurrentOwnerTeamId);
        builder.Entity<DraftPick>()
            .HasIndex(d => d.OriginalOwnerTeamId);

        // Configure DraftPick relationships to avoid cascade delete issues
        builder.Entity<DraftPick>()
            .HasOne(d => d.OriginalOwner)
            .WithMany()
            .HasForeignKey(d => d.OriginalOwnerTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<DraftPick>()
            .HasOne(d => d.CurrentOwner)
            .WithMany()
            .HasForeignKey(d => d.CurrentOwnerTeamId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<DraftPick>()
            .HasOne(d => d.League)
            .WithMany()
            .HasForeignKey(d => d.LeagueId)
            .OnDelete(DeleteBehavior.Cascade);

        // TradePickOffer index
        builder.Entity<TradePickOffer>()
            .HasIndex(t => t.TradeId);
        builder.Entity<TradePickOffer>()
            .HasIndex(t => t.DraftPickId);


    }
}