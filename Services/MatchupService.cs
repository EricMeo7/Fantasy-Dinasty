using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;

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
            .ToListAsync();
        
        // Mappa UserId -> TeamId
        var userToTeamMap = teams.ToDictionary(t => t.UserId, t => t.Id);
        var teamIntIds = teams.Select(t => t.Id).ToList();

        foreach (var team in teams)
        {
            await EnsureLineupsExistAsync(team.Id, minDate, maxDate);
        }

        // 2b. CARICAMENTO BULK LINEUP (Usa int IDs)
        var allLineups = await _context.DailyLineups
            .Where(d => teamIntIds.Contains(d.TeamId) && d.Date >= minDate && d.Date < maxDate)
            .Include(d => d.Player)
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
                        .Include(d => d.Player)
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

    private async Task EnsureLineupsExistAsync(int teamId, DateTime start, DateTime end)
    {
        // Recupera le lineup esistenti nel range
        var existingDates = await _context.DailyLineups
            .Where(d => d.TeamId == teamId && d.Date >= start && d.Date < end)
            .Select(d => d.Date.Date)
            .Distinct()
            .ToListAsync();

        var missingDates = new List<DateTime>();
        for (DateTime d = start; d < end; d = d.AddDays(1))
        {
            if (d > DateTime.UtcNow.Date) continue; // Non generiamo futuri
            if (!existingDates.Contains(d.Date)) missingDates.Add(d.Date);
        }

        if (!missingDates.Any()) return;

        // Ordina le date mancanti
        missingDates.Sort();

        // Recupera l'ultima lineup valida PRIMA del range (per il primo carry-over)
        var lastValidLineup = await _context.DailyLineups
            .Where(d => d.TeamId == teamId && d.Date < start)
            .OrderByDescending(d => d.Date)
            .FirstOrDefaultAsync();

        List<DailyLineup>? templateLineup = null;

        if (lastValidLineup != null)
        {
            templateLineup = await _context.DailyLineups
                .Where(d => d.TeamId == teamId && d.Date == lastValidLineup.Date)
                .AsNoTracking()
                .ToListAsync();
        }
        else
        {
            // Fallback: Genera from Contracts (Default)
            var contracts = await _context.Contracts
                .Where(c => c.TeamId == teamId)
                .Include(c => c.Player)
                .AsNoTracking()
                .ToListAsync();

            templateLineup = contracts.Select(c => new DailyLineup
            {
                TeamId = teamId,
                PlayerId = c.PlayerId,
                IsStarter = false, // Default: tutti in panchina, l'utente li schiera manualmente
                Slot = c.Player.Position,
                BenchOrder = 0
            }).ToList();
        }

        var newEntriesBuffer = new List<DailyLineup>();

        foreach (var date in missingDates)
        {
            // Clona il template per la nuova data
            if (templateLineup != null)
            {
                foreach (var templateItem in templateLineup)
            {
                newEntriesBuffer.Add(new DailyLineup
                {
                    TeamId = teamId,
                    PlayerId = templateItem.PlayerId,
                    Date = date,
                    IsStarter = templateItem.IsStarter,
                    Slot = templateItem.Slot,
                    BenchOrder = templateItem.BenchOrder
                });
            }
            }
        }

        if (newEntriesBuffer.Any())
        {
            // Salvataggio Bulk
            await _context.DailyLineups.AddRangeAsync(newEntriesBuffer);
            await _context.SaveChangesAsync();
        }
    }

    // Refactored to Best Score of the Week (Best Ball) Logic
    private double CalculateWeeklyScoreInMemory(int teamUserId, DateTime start, DateTime end, LeagueSettings settings, List<DailyLineup> allLineups, List<PlayerGameLog> allLogs)
    {
         // 1. Determine the Active Lineup for the Week.
         // Requirement: "Best score of the week for each role deployed."
         // Implies a single lineup governs the week (Weekly Lock).
         // We use the lineup from the Start Date of the matchup range.
         
         var activeLineup = allLineups
            .Where(d => d.TeamId == teamUserId && d.Date.Date == start.Date)
            .ToList();

         // If empty (e.g. week starts today but lineup not generated?), try to find any lineup in range
         if (!activeLineup.Any())
         {
             activeLineup = allLineups
                .Where(d => d.TeamId == teamUserId && d.Date >= start && d.Date < end)
                .OrderBy(d => d.Date)
                .GroupBy(d => d.Date)
                .FirstOrDefault()?.ToList() ?? new List<DailyLineup>();
         }

         // Se ancora vuota, fallback aggressivo: prendi l'ultima lineup disponibile PRIMA della settimana (Carry-over logico)
         if (!activeLineup.Any())
         {
             // TODO: Questo è pesante, ma necessario se non ci sono lineup nella settimana.
             // Per ora ritorniamo 0 per evitare errori, ma è qui il problema del "0-0" se non si è loggato.
             // _logger.LogWarning($"Nessuna lineup trovata per Team {teamUserId} nella settimana {start.ToShortDateString()} - {end.ToShortDateString()}");
             return 0;
         }

         if (!activeLineup.Any()) return 0;

         double weeklyTotal = 0;
         var starters = activeLineup.Where(d => d.IsStarter).ToList();

         // 2. For each Starter => Find MAX score in the week
         foreach (var starter in starters)
         {
             // Get all logs for this player in the week range
             // Date string format comparison
             string sDateStr = start.ToString("yyyy-MM-dd");
             string eDateStr = end.ToString("yyyy-MM-dd");

             var playerLogs = allLogs
                 .Where(l => l.PlayerId == starter.PlayerId && 
                             l.GameDate.CompareTo(sDateStr) >= 0 && 
                             l.GameDate.CompareTo(eDateStr) < 0)
                 .ToList();

            if (playerLogs.Any())
            {
                // Calculate FP for each log and take MAX
                double maxScore = playerLogs.Max(l => CalculateFantasyPoints(l, settings));
                weeklyTotal += maxScore;
            }
             
             // No Bench Substitution (Explicit Requirement)
         }

         return weeklyTotal;
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

        return Math.Round(pts + reb + ast + stl + blk + tov, 1);
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