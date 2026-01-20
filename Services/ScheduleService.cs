using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Services;

public class ScheduleService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ScheduleService> _logger;
    private readonly Microsoft.Extensions.Localization.IStringLocalizer<SharedResource> _localizer;

    public ScheduleService(ApplicationDbContext context, ILogger<ScheduleService> logger, Microsoft.Extensions.Localization.IStringLocalizer<SharedResource> localizer)
    {
        _context = context;
        _logger = logger;
        _localizer = localizer;
    }

    private DateTime GetDynamicSeasonEndDate()
    {
        var now = DateTime.UtcNow;
        // Se siamo dopo Agosto, la stagione finisce l'anno prossimo
        int endYear = (now.Month >= 8) ? now.Year + 1 : now.Year;
        // Fine Regular Season indicativa: 20 Aprile (Extended to avoid missing weeks)
        return new DateTime(endYear, 04, 20);
    }

    public async Task GenerateCalendarAsync(int leagueId, ScheduleMode mode)
    {
        var league = await _context.Leagues.Include(l => l.Teams).FirstOrDefaultAsync(l => l.Id == leagueId);
        
        if (league == null)
        {
             throw new FluentValidation.ValidationException(_localizer["LeagueNotFound"]);
        }

        if (league.Teams.Count < 2)
        {
            var message = string.Format(_localizer["NotEnoughTeams"], league.Teams.Count);
            throw new FluentValidation.ValidationException(message);
        }

        // FETCH PLAYOFF SETTINGS
        var settings = await _context.LeagueSettings.FirstOrDefaultAsync(s => s.LeagueId == leagueId);
        int playoffTeams = settings?.PlayoffTeams ?? 4;
        
        // Calcola settimane di Playoff necessarie (Log2)
        // 2 squadre -> 1 sett (Finale)
        // 4 squadre -> 2 sett (Semi + Finale)
        // 8 squadre -> 3 sett (Quarti + Semi + Finale)
        int playoffWeeks = (int)Math.Max(1, Math.Ceiling(Math.Log2(playoffTeams)));

        // 1. Pulizia TOTALE calendario e formazioni (User Request: "non deve rimanere traccia")
        var allMatches = await _context.Matchups
            .Where(m => m.LeagueId == leagueId)
            .ToListAsync();
        _context.Matchups.RemoveRange(allMatches);

        var allLineups = await _context.DailyLineups
            .Where(l => l.LeagueId == leagueId)
            .ToListAsync();
        _context.DailyLineups.RemoveRange(allLineups);

        await _context.SaveChangesAsync();
        
        // 2. Division Assignment (Robust & Balanced)
        int eastCount = league.Teams.Count(t => t.Division == Division.East);
        int westCount = league.Teams.Count(t => t.Division == Division.West);
        bool isUnbalanced = Math.Abs(eastCount - westCount) > 1;

        // Se c'è una squadra senza divisione O se sono sbilanciate (es. 6 vs 4), ricalcoliamo.
        if (league.Teams.Any(t => t.Division == Division.None) || isUnbalanced)
        {
            _logger.LogInformation($"Ribilanciamento Divisioni necessario (East: {eastCount}, West: {westCount}). Re-shuffling...");
            
            var rnd = new Random();
            var shuffledParams = league.Teams.OrderBy(x => rnd.Next()).ToList();
            int mid = shuffledParams.Count / 2;
            
            for (int i = 0; i < shuffledParams.Count; i++)
            {
                 shuffledParams[i].Division = i < mid ? Division.East : Division.West;
            }
            
            // Salva subito le divisioni
            await _context.SaveChangesAsync();
        }

        // Ricarica le squadre per essere sicuri che EF abbia lo stato aggiornato (anche se dovrebbe averlo)
        // Ma soprattutto per garantire che le liste East/West siano corrette.
        var eastTeams = league.Teams.Where(t => t.Division == Division.East).Select(t => t.UserId).ToList();
        var westTeams = league.Teams.Where(t => t.Division == Division.West).Select(t => t.UserId).ToList();

        _logger.LogInformation($"Teams East: {eastTeams.Count}, Teams West: {westTeams.Count}");


        // 3. Determina Start Week & Date
        DateTime seasonStartDate = league.SeasonStartDate ?? DateTime.UtcNow.Date;
        
        // Se non ci sono match giocati, partiamo dall'inizio. 
        // Se ci sono match giocati, dobbiamo capire quando finisce l'ultimo match giocato.
        // MA per semplicità, se rigeneriamo il calendario, assumiamo che si voglia rigenerare 
        // da "Oggi" o dalla "Data Inizio Lega" se non è ancora iniziata.
        // Se ci sono match passati (IsPlayed=true), NON li tocchiamo e partiamo dalla prima data utile successiva.
        
        // Sempre dalla settimana 1 dopo una rigenerazione totale
        int startWeekNumber = 1;

        DateTime effectiveStartDate = seasonStartDate;
        if (effectiveStartDate < DateTime.UtcNow.Date)
        {
            // Se la lega doveva iniziare nel passato ma non ha giocato nulla, partiamo da oggi?
            // O manteniamo la data storica? Manteniamo data storica user-defined se possibile, 
            // ma se è Daily mode e i giorni sono passati, verranno skippati se non ci sono partite?
            // Meglio partire da MAX(SeasonStart, Today) se non si è giocato nulla?
            // "Al momento della creazione del calendario"... 
            // Facciamo che parte da seasonStartDate. Se è passato, pazienza (saranno match non giocati o recuperati?)
            // Se vogliamo essere safe: effectiveStartDate = DateTime.UtcNow.Date; (Se non ci sono match)
            // TUTTAVIA: Spesso si crea il calendario PRIMA dell'inizio.
        }

        // 4. Calcola Regular Season End
        DateTime regularSeasonEnd = GetDynamicSeasonEndDate().AddDays(-(playoffWeeks * 7));
        
        // 4b. Genera TIME SLOTS
        var timeSlots = await GenerateTimeSlots(effectiveStartDate, regularSeasonEnd, mode);
        
        if (!timeSlots.Any())
        {
            _logger.LogWarning("Nessuno slot temporale disponibile per la Regular Season.");
            return;
        }

        int totalWeeksToGen = timeSlots.Count;
        _logger.LogInformation($"Generazione Regular Season: {totalWeeksToGen} periodi (Mode: {mode}).");

        // 5. Generazione Match Templates (Round Robin)
        var scheduledTemplates = new List<List<Matchup>>();
        
        bool useUnifiedSchedule = league.Teams.Count < 4 || eastTeams.Count < 2 || westTeams.Count < 2;

        if (useUnifiedSchedule)
        {
             _logger.LogInformation($"[Schedule] Small League. Using UNIFIED Round Robin.");
             var allUserIds = league.Teams.Select(t => t.UserId).ToList();
             var roundRobin = GenerateRoundRobin(allUserIds, leagueId);
             
             if (roundRobin.Count == 0 || roundRobin[0].Count == 0) return;

             int rrIndex = 0;
             for (int w = 0; w < totalWeeksToGen; w++)
             {
                 scheduledTemplates.Add(roundRobin[rrIndex]);
                 rrIndex = (rrIndex + 1) % roundRobin.Count;
             }
        }
        else
        {
            _logger.LogInformation($"[Schedule] Standard League. Using INTRA/INTER cycle.");
            var intra1 = GenerateRoundRobin(eastTeams, leagueId);
            var intra2 = GenerateRoundRobin(westTeams, leagueId);
            var inter = GenerateInterDivision(eastTeams, westTeams, leagueId);

            int intraLen = Math.Max(intra1.Count, intra2.Count);
            int interLen = inter.Count;
            int pointerIntra = 0;
            int pointerInter = 0;
            int cycleStage = 0; 

            for (int w = 0; w < totalWeeksToGen; w++)
            {
                var combinedWeek = new List<Matchup>();
                if (cycleStage == 0 || cycleStage == 1) // INTRA
                {
                    if (pointerIntra < intra1.Count) combinedWeek.AddRange(intra1[pointerIntra]);
                    if (pointerIntra < intra2.Count) combinedWeek.AddRange(intra2[pointerIntra]);
                    pointerIntra++;
                    if (pointerIntra >= intraLen) { pointerIntra = 0; cycleStage++; }
                }
                else // INTER
                {
                    if (pointerInter < inter.Count) combinedWeek.AddRange(inter[pointerInter]);
                    pointerInter++;
                    if (pointerInter >= interLen) { pointerInter = 0; cycleStage = 0; }
                }
                scheduledTemplates.Add(combinedWeek);
            }
        }

        // 6. Merge Templates with TimeSlots
        var finalMatches = new List<Matchup>();
        for (int i = 0; i < totalWeeksToGen; i++)
        {
             var slot = timeSlots[i];
             var templateRaw = scheduledTemplates[i];
             var weekNum = startWeekNumber + i;

             foreach (var m in templateRaw)
             {
                 var realMatch = CloneMatch(m, weekNum);
                 realMatch.StartAt = slot.Start;
                 realMatch.EndAt = slot.End;
                 finalMatches.Add(realMatch);
             }
        }

        // 7. Playoff Placeholders
        // Playoff Start = Fine Regular.
        // Playoff Weeks are usually 7-days standard? Or follow the mode?
        // Let's assume Playoff are always 7 days for now/robustness, or standard Monday-Sunday.
        DateTime playoffStartDate = (timeSlots.LastOrDefault().End != default) ? timeSlots.Last().End : regularSeasonEnd;
        
        var playoffMatches = GeneratePlayoffPlaceholders(leagueId, startWeekNumber + totalWeeksToGen, playoffTeams, playoffWeeks, playoffStartDate);
        finalMatches.AddRange(playoffMatches);

        await _context.Matchups.AddRangeAsync(finalMatches);
        await _context.SaveChangesAsync();
    }

    private async Task<List<(DateTime Start, DateTime End)>> GenerateTimeSlots(DateTime start, DateTime end, ScheduleMode mode)
    {
        var slots = new List<(DateTime Start, DateTime End)>();
        DateTime cursor = start;
        
        // Load ALL game dates for the period to validate slots
        // This is crucial for SKIPPING empty weeks (e.g. All-Star Break, Pre/Post Season gaps)
        var gameDates = (await _context.NbaGames
            .Where(g => g.GameDate >= start && g.GameDate <= end)
            .Select(g => g.GameDate.Date)
            .ToListAsync()) 
            .ToHashSet();

        while (cursor < end)
        {
            DateTime next;

            if (mode == ScheduleMode.Weekly)
            {
                // 7 days fixed.
                next = cursor.AddDays(7);
            }
            else if (mode == ScheduleMode.SplitWeek)
            {
                // Logic for Split Week
                DayOfWeek dow = cursor.DayOfWeek;
                int daysToAdd = 0;
                
                if (dow == DayOfWeek.Friday || dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday)
                {
                    // Target: Next Monday.
                    int d = (int)dow;
                    daysToAdd = (d == 0) ? 1 : (8 - d);
                }
                else
                {
                    // Target: Friday.
                    int d = (int)dow;
                    if (d == 0) d = 7; 
                    daysToAdd = 5 - d;
                }
                
                if (daysToAdd <= 0) daysToAdd = 1; 
                next = cursor.AddDays(daysToAdd);
            }
            else // Daily
            {
                next = cursor.AddDays(1);
            }

            // VALIDATION: Does this slot contain at least one NBA game?
            // Range [cursor, next) - verifying if any gameDate falls in this range
            bool hasGames = gameDates.Any(d => d >= cursor && d < next);

            if (hasGames)
            {
                slots.Add((cursor, next));
            }
            else
            {
                // Empty Period (e.g. All Star Week). 
                // We SKIP adding this slot, effectively "collapsing" the schedule timeline 
                // so the matchup week continues in the NEXT valid slot.
                // Or rather, the schedule just has a gap?
                // The user requirement: "devi escludere quella week... e scalare di una week in avanti"
                // Meaning: Match 1 is Week 1. Match 2 is Week 2 (which is physically 2 weeks vs 3 weeks later if there's a gap).
                // So yes, just skipping the add is correct. The Loop index 'i' in GenerateCalendarAsync drives the WeekNumber.
            }

            cursor = next;
        }
        
        return slots;
    }

    private List<Matchup> GeneratePlayoffPlaceholders(int leagueId, int startWeek, int numTeams, int numWeeks, DateTime startDate)
    {
        var list = new List<Matchup>();
        int currentWeek = startWeek;
        DateTime cursorDate = startDate;

        // Playoff logic simplified: 1 week per round (Standard 7 days)
        void AddRound(string tA, string tB, FantasyBasket.API.Models.MatchType type, int week, DateTime start)
        {
            list.Add(new Matchup { 
                LeagueId = leagueId, WeekNumber = week, Type = type,
                HomeTeamPlaceholder = tA, AwayTeamPlaceholder = tB,
                StartAt = start, EndAt = start.AddDays(7)
            });
        }
        
        // ... (Logic from before, adapted for Dates)
        // Need to loop/generate.
        
        for (int w = 0; w < numWeeks; w++)
        {
             // Determine matches for this round/week
             // Reuse existing logic structure but simpler
        }
        
        // Re-implementing specific scenarios because I cut the original method:
        if (numTeams == 4)
        {
             // Week 1
             AddRound("1st Seed", "4th Seed", FantasyBasket.API.Models.MatchType.PlayoffSemiFinal, currentWeek, cursorDate);
             AddRound("2nd Seed", "3rd Seed", FantasyBasket.API.Models.MatchType.PlayoffSemiFinal, currentWeek, cursorDate);
             
             cursorDate = cursorDate.AddDays(7); currentWeek++;
             
             // Week 2
             AddRound("Winner Semi A", "Winner Semi B", FantasyBasket.API.Models.MatchType.NbaFinal, currentWeek, cursorDate);
        }
        else if (numTeams == 2)
        {
             AddRound("1st Seed", "2nd Seed", FantasyBasket.API.Models.MatchType.NbaFinal, currentWeek, cursorDate);
        }
        else // 8
        {
             // Q
             AddRound("1st Seed", "8th Seed", FantasyBasket.API.Models.MatchType.PlayoffQuarterFinal, currentWeek, cursorDate);
             AddRound("2nd Seed", "7th Seed", FantasyBasket.API.Models.MatchType.PlayoffQuarterFinal, currentWeek, cursorDate);
             AddRound("3rd Seed", "6th Seed", FantasyBasket.API.Models.MatchType.PlayoffQuarterFinal, currentWeek, cursorDate);
             AddRound("4th Seed", "5th Seed", FantasyBasket.API.Models.MatchType.PlayoffQuarterFinal, currentWeek, cursorDate);
             cursorDate = cursorDate.AddDays(7); currentWeek++;
             
             // S
             AddRound("Winner Q1 (1-8)", "Winner Q4 (4-5)", FantasyBasket.API.Models.MatchType.PlayoffSemiFinal, currentWeek, cursorDate);
             AddRound("Winner Q2 (2-7)", "Winner Q3 (3-6)", FantasyBasket.API.Models.MatchType.PlayoffSemiFinal, currentWeek, cursorDate);
             cursorDate = cursorDate.AddDays(7); currentWeek++;
             
             // F
             AddRound("Winner Semi A", "Winner Semi B", FantasyBasket.API.Models.MatchType.NbaFinal, currentWeek, cursorDate);
        }

        return list;
    }

    private Matchup CloneMatch(Matchup prototype, int week)
    {
        return new Matchup
        {
            LeagueId = prototype.LeagueId,
            WeekNumber = week,
            HomeTeamId = prototype.HomeTeamId,
            AwayTeamId = prototype.AwayTeamId,
            IsPlayed = false,
            Type = FantasyBasket.API.Models.MatchType.RegularSeason
        };
    }

    // Standard Round Robin Generator
    private List<List<Matchup>> GenerateRoundRobin(List<string> teams, int leagueId)
    {
        var result = new List<List<Matchup>>();
        var activeTeams = new List<string>(teams);
        if (activeTeams.Count % 2 != 0) activeTeams.Add("BYE");

        int n = activeTeams.Count;
        int half = n / 2;

        for (int round = 0; round < n - 1; round++)
        {
            var roundMatches = new List<Matchup>();
            for (int i = 0; i < half; i++)
            {
                string home = activeTeams[i];
                string away = activeTeams[n - 1 - i];
                if (round % 2 == 1) (home, away) = (away, home);

                if (home != "BYE" && away != "BYE")
                {
                    roundMatches.Add(new Matchup { LeagueId = leagueId, HomeTeamId = home, AwayTeamId = away });
                }
            }
            result.Add(roundMatches);
            
            // Rotate
            var last = activeTeams[n - 1];
            activeTeams.RemoveAt(n - 1);
            activeTeams.Insert(1, last);
        }
        return result;
    }

    // Inter-Division (All East vs All West)
    private List<List<Matchup>> GenerateInterDivision(List<string> groupA, List<string> groupB, int leagueId)
    {
        // Simple Logic: Shift group B
        // Require |A| == |B| ideally. If not, padding needed.
        // Assuming balanced divisions for MVP. 
        // If unbalanced, some teams play double headers or byes.
        // Handling unbalanced simply: 
        var rounds = new List<List<Matchup>>();
        // Rotate B `groupA.Count` times?
        // Basic All-vs-All between two groups:
        // Round 0: A[0]-B[0], A[1]-B[1]...
        // Round 1: A[0]-B[1], A[1]-B[2]...
        
        // Pad to ensure equal size for rotation alignment
        var A = new List<string>(groupA);
        var B = new List<string>(groupB);
        while (A.Count < B.Count) A.Add("BYE");
        while (B.Count < A.Count) B.Add("BYE");
        
        int n = A.Count; // Rounds needed to play everyone
        
        for (int r = 0; r < n; r++)
        {
            var roundMatches = new List<Matchup>();
            for (int i = 0; i < n; i++)
            {
                int bIdx = (i + r) % n;
                string home = A[i];
                string away = B[bIdx];
                if (r % 2 == 1) (home, away) = (away, home); // Alternate home

                if (home != "BYE" && away != "BYE")
                {
                    roundMatches.Add(new Matchup { LeagueId = leagueId, HomeTeamId = home, AwayTeamId = away });
                }
            }
            if (roundMatches.Any()) rounds.Add(roundMatches);
        }
        return rounds;
    }
}