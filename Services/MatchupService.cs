using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq; // Ensure Linq availability

namespace FantasyBasket.API.Services;

public class MatchupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MatchupService> _logger;

    public MatchupService(ApplicationDbContext context, ILogger<MatchupService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task UpdateLiveScores(int leagueId)
    {
        // 1. Recupera Matchups attivi
        var matchups = await _context.Matchups
            .Where(m => m.LeagueId == leagueId && !m.IsPlayed)
            .ToListAsync();

        if (!matchups.Any()) return;

        // Eager Load Settings
        var league = await _context.Leagues
            .Include(l => l.Settings)
            .FirstOrDefaultAsync(l => l.Id == leagueId);
            
        if (league == null || league.SeasonStartDate == null) return;
        
        var settings = league.Settings ?? new LeagueSettings();
        DateTime seasonStart = league.SeasonStartDate.Value;
        
        // --- 1. PRE-CALCOLO DATE (RANGE TOTALE PER TUTTI I MATCHUP) ---
        // var matchupWeeks = matchups.Select(m => m.WeekNumber).Distinct().ToList(); // Non più affidabile
        
        DateTime minDate = DateTime.MaxValue;
        DateTime maxDate = DateTime.MinValue;

        foreach (var match in matchups)
        {
            DateTime ws, we;
            if (match.StartAt.HasValue && match.EndAt.HasValue)
            {
                ws = match.StartAt.Value;
                we = match.EndAt.Value;
            }
            else
            {
                // Fallback Legacy
                ws = seasonStart.AddDays((match.WeekNumber - 1) * 7);
                we = ws.AddDays(7);
            }

            if (ws < minDate) minDate = ws;
            if (we > maxDate) maxDate = we;
        }

        // Limitiamo al passato/presente
        if (maxDate > DateTime.UtcNow.AddDays(1)) maxDate = DateTime.UtcNow.AddDays(1);

        // --- 2. BULK LOAD DATI (TUTTI I TEAM E LINEUP COINVOLTI) ---
        // Matchup usa string UserId, ma Lineup usa int TeamId. Dobbiamo mappare.
        var userIds = matchups.SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId }).Distinct().ToList();

        // 2a. Carica Teams per avere la mappa UserId -> Id
        var teams = await _context.Teams
            .Where(t => t.LeagueId == leagueId && userIds.Contains(t.UserId))
            .AsNoTracking()
            .ToListAsync();
        
        // Mappa UserId -> TeamId
        var userToTeamMap = teams.ToDictionary(t => t.UserId, t => t.Id);
        var teamIntIds = teams.Select(t => t.Id).ToList();

        // OPTIMIZATION: One call for all teams to check/generate lineups
        await BulkEnsureLineupsExistAsync(teamIntIds, minDate, maxDate);

        // 2b. CARICAMENTO BULK LINEUP (Usa int IDs)
        // OPTIMIZATION: Removed .Include(d => d.Player) as we only need PlayerId and Slot for scoring.
        var allLineups = await _context.DailyLineups
            .Where(d => teamIntIds.Contains(d.TeamId) && d.Date >= minDate && d.Date < maxDate)
            .AsNoTracking()
            .ToListAsync();

        // 2c. CARICAMENTO BULK LOGS
        var relevantPlayerIds = allLineups.Select(l => l.PlayerId).Distinct().ToList();
        
        string sDateStr = minDate.ToString("yyyy-MM-dd");
        string eDateStr = maxDate.ToString("yyyy-MM-dd");

        var allLogs = await _context.PlayerGameLogs
            .Where(l => l.GameDate.CompareTo(sDateStr) >= 0 && l.GameDate.CompareTo(eDateStr) < 0 && relevantPlayerIds.Contains(l.PlayerId))
            .AsNoTracking()
            .ToListAsync();

        // --- 3. CALCOLO PUNTEGGI (IN MEMORIA) ---
        foreach (var match in matchups)
        {
            DateTime weekStart, weekEnd;
            if (match.StartAt.HasValue && match.EndAt.HasValue)
            {
                weekStart = match.StartAt.Value;
                weekEnd = match.EndAt.Value;
            }
            else
            {
                weekStart = seasonStart.AddDays((match.WeekNumber - 1) * 7);
                weekEnd = weekStart.AddDays(7);
            }
            
            // Ottimizzazione: Calcoliamo solo se la settimana è già iniziata
            if (weekStart <= DateTime.UtcNow)
            {
                // Risolvi TeamId (int) dal UserId (string) del Matchup
                if (!string.IsNullOrEmpty(match.HomeTeamId) && userToTeamMap.TryGetValue(match.HomeTeamId, out int homeTeamId))
                {
                    match.HomeScore = CalculateWeeklyScoreInMemory(homeTeamId, weekStart, weekEnd, settings, allLineups, allLogs);
                }
                
                if (!string.IsNullOrEmpty(match.AwayTeamId) && userToTeamMap.TryGetValue(match.AwayTeamId, out int awayTeamId))
                {
                     match.AwayScore = CalculateWeeklyScoreInMemory(awayTeamId, weekStart, weekEnd, settings, allLineups, allLogs);
                }
            }
        }

        await _context.SaveChangesAsync();
    }

    // --- NUOVO METODO: Finalizza i Matchup Terminati ---
    public async Task ProcessCompletedMatchups(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        // Trova matchup finiti nel passato (EndDate < Oggi) ma non ancora marcati "IsPlayed"
        var completedMatchups = await _context.Matchups
            .Where(m => m.EndAt < now && !m.IsPlayed)
            .ToListAsync(cancellationToken);

        if (!completedMatchups.Any()) return;

        _logger.LogInformation($"Trovati {completedMatchups.Count} matchup da finalizzare.");

        // Recupera dati necessari (lo facciamo in modo simile a UpdateLiveScores ma più mirato)
        var leagueIds = completedMatchups.Select(m => m.LeagueId).Distinct().ToList();
        var allLeagues = await _context.Leagues.Include(l => l.Settings).Where(l => leagueIds.Contains(l.Id)).ToListAsync(cancellationToken);
        
        // Per ricalcolare i punteggi finali precisi, dobbiamo caricare lineups e logs.
        // Per semplicità e robustezza, richiamiamo la logica di calcolo 'in memory' riutilizzando il codice di UpdateLiveScores
        // O meglio ancora: riusiamo UpdateLiveScores logic ma SOLO per questi matchup.
        // Ma UpdateLiveScores filtra per !IsPlayed, quindi ok.
        
        // Tuttavia, qui dobbiamo settare IsPlayed = true.
        
        // 1. Facciamo un giro di aggiornamento punteggi "Finale"
        // (Nota: potremmo chiamare UpdateLiveScores per ogni lega coinvolta, ma sarebbe ridondante)
        
        // Implementazione diretta e ottimizzata per la finalizzazione:
        foreach (var match in completedMatchups)
        {
            try 
            {
                var league = allLeagues.FirstOrDefault(l => l.Id == match.LeagueId);
                if (league == null) continue;

                // Calcolo Punteggio Finale (Se zero, proviamo a ricalcolare)
                // Se è 0-0, potrebbe essere legittimo, ma proviamo a rifare il calcolo per sicurezza
                // Recuperiamo team IDs
                var homeTeam = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == match.HomeTeamId && t.LeagueId == match.LeagueId, cancellationToken);
                var awayTeam = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == match.AwayTeamId && t.LeagueId == match.LeagueId, cancellationToken);

                if (homeTeam != null && awayTeam != null)
                {
                    // === RECALC FINAL SCORE LOGIC ===
                    // Carichiamo dati specifici per questo match
                    var matchStart = match.StartAt ?? DateTime.MinValue;
                    var matchEnd = match.EndAt ?? DateTime.MinValue;

                    // Lineups
                    var lineups = await _context.DailyLineups
                        .Where(d => (d.TeamId == homeTeam.Id || d.TeamId == awayTeam.Id) && d.Date >= matchStart && d.Date < matchEnd)
                        // .Include(d => d.Player) // Optimization: Not needed for scoring
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);

                    // Punti (Logs)
                    var playerIds = lineups.Select(l => l.PlayerId).Distinct().ToList();
                    var sDateStr = matchStart.ToString("yyyy-MM-dd");
                    var eDateStr = matchEnd.ToString("yyyy-MM-dd");
                    var logs = await _context.PlayerGameLogs
                        .Where(l => playerIds.Contains(l.PlayerId) && l.GameDate.CompareTo(sDateStr) >= 0 && l.GameDate.CompareTo(eDateStr) < 0)
                        .AsNoTracking()
                        .ToListAsync(cancellationToken);

                    var settings = league.Settings ?? new LeagueSettings();

                    // Ricalcoliamo
                    match.HomeScore = CalculateWeeklyScoreInMemory(homeTeam.Id, matchStart, matchEnd, settings, lineups, logs);
                    match.AwayScore = CalculateWeeklyScoreInMemory(awayTeam.Id, matchStart, matchEnd, settings, lineups, logs);
                    
                    // Logga per debug se ancora 0
                    if (match.HomeScore == 0 && match.AwayScore == 0)
                    {
                        _logger.LogWarning($"Matchup {match.Id} finalizzato a 0-0. (Week: {match.WeekNumber})");
                    }
                }

                // MARK AS PLAYED - Questo sblocca la classifica!
                match.IsPlayed = true; 
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore finalizzando matchup {match.Id}");
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task BulkEnsureLineupsExistAsync(List<int> teamIds, DateTime start, DateTime end)
    {
        // 1. Fetch all existing lineups for these teams in the range
        var existingLineups = await _context.DailyLineups
            .Where(d => teamIds.Contains(d.TeamId) && d.Date >= start && d.Date < end)
            .Select(d => new { d.TeamId, d.Date })
            .AsNoTracking()
            .ToListAsync();

        var existingMap = existingLineups
            .GroupBy(l => l.TeamId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Date.Date).ToHashSet());

        var newEntriesBuffer = new List<DailyLineup>();
        var now = DateTime.UtcNow.Date;

        foreach (var teamId in teamIds)
        {
            var missingDates = new List<DateTime>();
            var teamExisting = existingMap.ContainsKey(teamId) ? existingMap[teamId] : new HashSet<DateTime>();

            for (DateTime d = start.Date; d < end.Date; d = d.AddDays(1))
            {
                if (d > now) continue;
                if (!teamExisting.Contains(d)) missingDates.Add(d);
            }

            if (!missingDates.Any()) continue;

            // Load last valid lineup OR contracts as template
            var lastValidDate = await _context.DailyLineups
                .Where(d => d.TeamId == teamId && d.Date < missingDates.First())
                .OrderByDescending(d => d.Date)
                .Select(d => (DateTime?)d.Date)
                .FirstOrDefaultAsync();

            List<DailyLineup> template;
            if (lastValidDate != null)
            {
                template = await _context.DailyLineups
                    .Where(d => d.TeamId == teamId && d.Date == lastValidDate)
                    .AsNoTracking()
                    .ToListAsync();
            }
            else
            {
                var contracts = await _context.Contracts
                    .Where(c => c.TeamId == teamId)
                    .Include(c => c.Player)
                    .AsNoTracking()
                    .ToListAsync();

                template = contracts.Select(c => new DailyLineup
                {
                    TeamId = teamId,
                    PlayerId = c.PlayerId,
                    IsStarter = false,
                    Slot = c.Player.Position,
                    BenchOrder = 0
                }).ToList();
            }

            foreach (var date in missingDates)
            {
                foreach (var item in template)
                {
                    newEntriesBuffer.Add(new DailyLineup
                    {
                        TeamId = teamId,
                        PlayerId = item.PlayerId,
                        Date = date,
                        IsStarter = item.IsStarter,
                        Slot = item.Slot,
                        BenchOrder = item.BenchOrder
                    });
                }
            }
        }

        if (newEntriesBuffer.Any())
        {
            await _context.DailyLineups.AddRangeAsync(newEntriesBuffer);
            await _context.SaveChangesAsync();
        }
    }

    private async Task EnsureLineupsExistAsync(int teamId, DateTime start, DateTime end)
    {
        await BulkEnsureLineupsExistAsync(new List<int> { teamId }, start, end);
    }

    // Refactored to Best Score of the Week (Best Ball) Logic matching GetMatchDetailsHandler
    private double CalculateWeeklyScoreInMemory(int teamId, DateTime start, DateTime end, LeagueSettings settings, List<DailyLineup> allLineups, List<PlayerGameLog> allLogs)
    {
        // 1. Get ALL DailyLineups for the week where the player was a STARTER
        // We need to look at the whole week because players might change or slots might change daily?
        // Even if they don't change, we need to know who was in the slot on the day of the game.
        
        var weekStarters = allLineups
            .Where(d => d.TeamId == teamId && d.Date >= start && d.Date < end && d.IsStarter)
            .ToList();

        if (!weekStarters.Any()) return 0;

        // Map: (PlayerId, DateStr) -> Slot
        // This tells us: "On Date X, Player Y was active in Slot Z"
        var starterSlots = weekStarters
            .GroupBy(x => new { x.PlayerId, DateStr = x.Date.ToString("yyyy-MM-dd") })
            .ToDictionary(g => g.Key, g => g.First().Slot);

        // 2. Filter Valid Logs (Must be in lineup on that day)
        string sDateStr = start.ToString("yyyy-MM-dd");
        string eDateStr = end.ToString("yyyy-MM-dd");

        // Optimization: Filter logs for players involved first
        var involvedPlayerIds = new HashSet<int>(weekStarters.Select(x => x.PlayerId).Distinct());

        var validLogs = allLogs
            .Where(l => l.GameDate.CompareTo(sDateStr) >= 0 && 
                        l.GameDate.CompareTo(eDateStr) < 0 && 
                        involvedPlayerIds.Contains(l.PlayerId))
            .ToList();

        // 3. Transform logs to "Slot Performances"
        var slotPerformances = new List<(string Slot, double Points)>();

        foreach (var log in validLogs)
        {
            var key = new { log.PlayerId, DateStr = log.GameDate };
            if (starterSlots.TryGetValue(key, out string slot))
            {
                double points = CalculateFantasyPoints(log, settings);
                slotPerformances.Add((slot, points));
            }
        }

        if (!slotPerformances.Any()) return 0;

        // 4. Group by Slot -> Take Max -> Sum
        // This is the core Best Ball logic: "Best score of the week for each role deployed"
        var weeklyTotal = slotPerformances
            .GroupBy(x => x.Slot)
            .Sum(g => g.Max(x => x.Points));

        return Math.Round(weeklyTotal, 1);
    }

    // Helper removed as logic is now inline or simple
    // private double CalculateDailyScore... (Removed)

    private double CalculateFantasyPoints(PlayerGameLog log, LeagueSettings s)
    {
        // Calcolo dinamico in base ai settings
        double pts = log.Points * s.PointWeight;
        double reb = log.Rebounds * s.ReboundWeight;
        double ast = log.Assists * s.AssistWeight;
        double stl = log.Steals * s.StealWeight;
        double blk = log.Blocks * s.BlockWeight;
        double tov = log.Turnovers * s.TurnoverWeight;

        // Advanced
        double fgm = log.Fgm * s.FgmWeight;
        double fga = log.Fga * s.FgaWeight;
        double ftm = log.Ftm * s.FtmWeight;
        double fta = log.Fta * s.FtaWeight;
        double tpm = log.ThreePm * s.ThreePmWeight;
        double tpa = log.ThreePa * s.ThreePaWeight;
        double oreb = log.OffRebounds * s.OrebWeight;
        double dreb = log.DefRebounds * s.DrebWeight;
        // Win/Loss only applies if player actually played (Minutes > 0)
        double win = 0;
        if (log.Minutes > 0)
        {
             win = log.Won ? s.WinWeight : s.LossWeight;
        }

        return Math.Round(pts + reb + ast + stl + blk + tov + fgm + fga + ftm + fta + tpm + tpa + oreb + dreb + win, 1);
    }

    private bool IsRoleCompatible(string slot, string playerPos)
    {
        // TODO: Migliorare con RosterSlots configurabili se necessario
        if (slot == "PG" || slot == "SG") return playerPos.Contains("G");
        if (slot == "SF" || slot == "PF") return playerPos.Contains("F");
        if (slot == "C") return playerPos.Contains("C");
        return false;
    }
}