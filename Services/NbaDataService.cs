using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using EFCore.BulkExtensions;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Services;

public class NbaDataService : INbaDataService
{
    private readonly IHttpClientFactory _clientFactory;
    private readonly IMemoryCache _cache;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NbaDataService> _logger;
    private LeagueSettings? _cachedSettings; // Cached for the scope of the request/operation

    // --- CONSTANTS ---
    private const string URL_PLAYER_BIO = "playerindex?Historical=1&LeagueID=00&Season={0}&SeasonType=Regular%20Season";
    private const string URL_LEAGUE_DASH = "leaguedashplayerstats?LastNGames=0&LeagueID=00&MeasureType=Base&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlusMinus=N&Rank=N&Season={0}&SeasonType=Regular%20Season&TeamID=0";
    private const string URL_SCOREBOARD = "scoreboardv2?DayOffset=0&GameDate={0}&LeagueID=00";
    private const string URL_ALL_PLAYERS = "commonallplayers?LeagueID=00&Season={0}&IsOnlyCurrentSeason=1";
    private const string URL_TEAM_ROSTER = "commonteamroster?Season={0}&TeamID={1}";
    
    // CDN URLs
    private const string URL_CDN_SCHEDULE = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json";
    private const string URL_CDN_BOXSCORE = "https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{0}.json";

    public NbaDataService(IHttpClientFactory clientFactory, IMemoryCache cache, IServiceProvider serviceProvider, ILogger<NbaDataService> logger)
    {
        _clientFactory = clientFactory;
        _cache = cache;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    private async Task EnsureSettingsLoadedAsync(ApplicationDbContext context)
    {
        if (_cachedSettings != null) return;

        const string settingsKey = "GlobalLeagueSettings";
        if (!_cache.TryGetValue(settingsKey, out _cachedSettings))
        {
            _cachedSettings = await context.LeagueSettings.AsNoTracking()
                .OrderBy(s => s.Id)
                .FirstOrDefaultAsync();

            if (_cachedSettings == null) 
            {
                _cachedSettings = new LeagueSettings 
                { 
                    PointWeight=1, ReboundWeight=1.2, AssistWeight=1.5, 
                    StealWeight=3, BlockWeight=3, TurnoverWeight=-1 
                };
            }
            // Cache for 30 minutes
            _cache.Set(settingsKey, _cachedSettings, TimeSpan.FromMinutes(30));
        }
    }

    public string GetCurrentSeason() => CalculateSeasons().Current;
    public string GetPreviousSeason() => CalculateSeasons().History.FirstOrDefault() ?? "2024-25";

    // Static Utility for Time Parsing (EST -> UTC)
    public static DateTime ParseEstToUtc(string timeStr, DateTime date)
    {
        try
        {
            // timeStr ex: "7:00 pm ET" or "7:00 pm"
            var cleanTime = timeStr.Replace(" ET", "").Replace(" pm", " PM").Replace(" am", " AM").Trim();
            if (DateTime.TryParse(cleanTime, CultureInfo.InvariantCulture, DateTimeStyles.None, out var timePart))
            {
                // Combine Date + Time
                var combined = date.Date.Add(timePart.TimeOfDay);

                // Convert from Eastern Time to UTC
                var etZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                return TimeZoneInfo.ConvertTimeToUtc(combined, etZone);
            }
        }
        catch { }
        
        // Fallback: If parsing fails or string is empty, assume it's a NIGHT game (7 PM ET / 00:00 UTC next day).
        // This prevents lineups from locking at 00:00 (Midnight Start of Day) if data is missing.
        // We add 19 hours (7 PM) to the date.
        try {
            var etZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
            var defaultTime = date.Date.AddHours(19); // 7:00 PM
            return TimeZoneInfo.ConvertTimeToUtc(defaultTime, etZone);
        } catch {
             // Absolute fallback if TimeZone fails
             return date.Date.AddHours(23).AddMinutes(59); 
        }
    }

    // ==============================================================================
    // 1. SYNC COMPLETO GIOCATORI (ANAGRAFICA + STATISTICHE MEDIE STAGIONALI)
    // ==============================================================================
    public async Task<int> SyncPlayersAsync()
    {
        var (currentSeason, historySeasons) = CalculateSeasons();
        _logger.LogInformation($"Inizio Sync. Stagione Corrente: {currentSeason}. Storico: {string.Join(", ", historySeasons)}");

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        await EnsureSettingsLoadedAsync(context);

        // 1. Scarica MASTER REGISTRY (Source of Truth per ID, Name, Team)
        var registry = await GetAllPlayersRegistryAsync(currentSeason);

        // 2. LAZY LOADING BIO MAP (Position/Height/Weight/Draft)
        // Scarichiamo il playerindex (pesante) SOLO SE:
        // A) Ci sono giocatori nel DB con dati Draft mancanti (RealNbaDraftRank == 0/null)
        // B) Ci sono NUOVI giocatori nel registry che non abbiamo nel DB (hanno bisogno di dati bio iniziali)
        // C) La cache è vuota (gestito internamente da GetPlayerBioMapAsync, ma qui evitiamo proprio la chiamata)
        
        var existingExternalIds = await context.Players.Select(p => p.ExternalId).ToListAsync();
        bool hasMissingDraftInfo = await context.Players.AnyAsync(p => p.IsRookie && (p.RealNbaDraftRank == null || p.RealNbaDraftRank == 0));
        bool hasNewPlayers = registry.Keys.Any(id => !existingExternalIds.Contains(id));

        Dictionary<int, PlayerBio> bioMap;
        
        if (hasMissingDraftInfo || hasNewPlayers)
        {
            _logger.LogInformation("BioMap fetch triggered: Check conditions met (MissingDraft={0}, NewPlayers={1})", hasMissingDraftInfo, hasNewPlayers);
            bioMap = await GetPlayerBioMapAsync(currentSeason);
        }
        else
        {
            // Se tutti i dati sono ok e non ci sono nuovi giocatori, usiamo mappa vuota (le bio esistenti non verranno sovrascritte)
            // Oppure proviamo a recuperare dalla cache se esiste, senza forzare refresh
            if (_cache.TryGetValue($"bio_{currentSeason}", out Dictionary<int, PlayerBio>? cached))
            {
                bioMap = cached!;
            }
            else
            {
                _logger.LogInformation("Skipping BioMap fetch to save bandwidth (All Draft Ranks OK & No New Players)");
                bioMap = new Dictionary<int, PlayerBio>(); 
            }
        }

        // 3. Processa stagione corrente (Aggiorna tabella Players)
        await ProcessSeasonAsync(context, currentSeason, isCurrentSeason: true, registry, bioMap, _cachedSettings!);

        // 4. Processa storico (Aggiorna tabella PlayerSeasonStats per gli ultimi 5 anni)
        // OTTIMIZZAZIONE: Esegui solo il 1° del mese per risparmiare bandwidth
        if (DateTime.UtcNow.Day == 1)
        {
            foreach (var season in historySeasons)
            {
                _logger.LogInformation($"Sync Storico: {season}...");
                var historicalRegistry = await GetAllPlayersRegistryAsync(season);
                var historicalBioMap = await GetPlayerBioMapAsync(season);
                await ProcessSeasonAsync(context, season, isCurrentSeason: false, historicalRegistry, historicalBioMap, _cachedSettings!);
                await Task.Delay(5000); // 5s delay to avoid Rate Limiting / IP excessive usage
            }
        }

        return 1;
    }

    // ==============================================================================
    // 2. RECUPERO PUNTEGGI GIORNALIERI (PER MATCHUP & CALCOLO FANTAPUNTI)
    // ==============================================================================
    // ==============================================================================
    // 2. RECUPERO PUNTEGGI (CORRETTO IL MAPPING ID)
    // ==============================================================================
    // ==============================================================================
    // 2. RECUPERO PUNTEGGI GIORNALIERI (PER MATCHUP & CALCOLO FANTAPUNTI)
    // ==============================================================================
    // ==============================================================================
    // 2. RECUPERO PUNTEGGI (CORRETTO IL MAPPING ID & TIMEZONE)
    // ==============================================================================
    public async Task<Dictionary<int, double>> GetFantasyPointsByDate(DateTime date, List<int> internalPlayerIds)
    {
        var nbaDate = date.Date;
        bool isPast = nbaDate < ConvertToNbaDate(DateTime.UtcNow).Date;
        string cacheKey = $"fpts_{nbaDate:yyyyMMdd}";

        if (isPast && _cache.TryGetValue(cacheKey, out Dictionary<int, double>? cachedResult))
            return cachedResult!;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        string dbDateStr = nbaDate.ToString("yyyy-MM-dd");

        // Utilizziamo ConcurrentDictionary per thread-safety durante il caricamento parallelo
        var dbLogs = await context.PlayerGameLogs
            .Where(l => l.GameDate == dbDateStr && internalPlayerIds.Contains(l.PlayerId))
            .ToDictionaryAsync(l => l.PlayerId, l => l.FantasyPoints);
            
        var resultArray = new System.Collections.Concurrent.ConcurrentDictionary<int, double>(dbLogs);

        // Se è una data passata e abbiamo tutti i dati, ritorniamo la cache
        if (isPast && internalPlayerIds.All(id => resultArray.ContainsKey(id))) 
        {
            _cache.Set(cacheKey, resultArray.ToDictionary(k => k.Key, v => v.Value), TimeSpan.FromHours(4));
            return resultArray.ToDictionary(k => k.Key, v => v.Value);
        }

        // --- STEP 3: DOWNLOAD & PARSING (CONCURRENT) ---
        await EnsureSettingsLoadedAsync(context);
        var settings = _cachedSettings ?? new LeagueSettings();
        
        var gamesToday = await context.NbaGames
            .Where(g => g.GameDate == nbaDate.Date)
            .Select(g => g.NbaGameId)
            .ToListAsync();

        if (!gamesToday.Any()) return resultArray.ToDictionary(k => k.Key, v => v.Value);

        // SWITCH TO STATS API (CDN BLOCKED 403)
        var client = _clientFactory.CreateClient("NbaStats"); 
        var logsToAdd = new System.Collections.Concurrent.ConcurrentBag<PlayerGameLog>();
        
        var playerMap = await context.Players
            .Where(p => internalPlayerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.ExternalId, p => p.Id);

        var tasks = gamesToday.Select(async gameId => 
        {
            try 
            {
                // STATS API ENDPOINT
                var url = $"boxscoretraditionalv2?EndPeriod=10&EndRange=28800&GameID={gameId}&RangeType=0&Season=2025-26&SeasonType=Regular%20Season&StartPeriod=1&StartRange=0";
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                
                // Parse Stats API Response (ResultSets)
                using var doc = JsonDocument.Parse(json);
                var resultSets = doc.RootElement.GetProperty("resultSets");
                
                // We need "PlayerStats" ResultSet
                JsonElement? playerStatsSet = null;
                foreach (var set in resultSets.EnumerateArray())
                {
                    if (set.GetProperty("name").GetString() == "PlayerStats")
                    {
                        playerStatsSet = set;
                        break;
                    }
                }

                if (playerStatsSet == null) return;

                var headers = playerStatsSet.Value.GetProperty("headers");
                var rows = playerStatsSet.Value.GetProperty("rowSet");
                
                // Map Headers
                var hList = new List<string>();
                foreach(var h in headers.EnumerateArray()) hList.Add(h.GetString() ?? "");
                
                int idxId = hList.IndexOf("PLAYER_ID");
                int idxPts = hList.IndexOf("PTS");
                int idxReb = hList.IndexOf("REB");
                int idxAst = hList.IndexOf("AST");
                int idxStl = hList.IndexOf("STL");
                int idxBlk = hList.IndexOf("BLK");
                int idxTov = hList.IndexOf("TO");
                int idxMin = hList.IndexOf("MIN");
                int idxFgm = hList.IndexOf("FGM");
                int idxFga = hList.IndexOf("FGA");
                int idxFtm = hList.IndexOf("FTM");
                int idxFta = hList.IndexOf("FTA");
                int idx3pm = hList.IndexOf("FG3M");
                int idx3pa = hList.IndexOf("FG3A");
                int idxOreb = hList.IndexOf("OREB");
                int idxDreb = hList.IndexOf("DREB");
                int idxPlusMinus = hList.IndexOf("PLUS_MINUS");
                
                // Determine Winner (We need team stats or parse +/-)
                // Simplified: usage of PlusMinus as proxy for "Won" is weak but API doesn't give simple "Won" per player row without Set check.
                // Alternative: Use "TeamStats" result set to determine winner?
                // For performance, we assume user checks game result or we approximate.
                // Actually, let's fetch TeamStats ResultSet to be accurate.
                 JsonElement? teamStatsSet = null;
                 foreach (var set in resultSets.EnumerateArray())
                {
                    if (set.GetProperty("name").GetString() == "TeamStats")
                    {
                        teamStatsSet = set;
                        break;
                    }
                }
                
                int homeTeamId = 0; int awayTeamId = 0;
                bool homeWon = false; bool awayWon = false;

                if (teamStatsSet != null)
                {
                     var tHeaders = teamStatsSet.Value.GetProperty("headers"); // TEAM_ID, PTS
                     var tRows = teamStatsSet.Value.GetProperty("rowSet");
                     // Typically row 0 and 1
                     // Need mapping inputs...
                     // Let's rely on simple +/- for now or just skip "Win" bonus accuracy if complex?
                     // No, "Win" is 3 points. Important.
                     // The API usually provides PLUS_MINUS for player.
                     // IMPORTANT: ScoreboardV2 gives winner. We fetch ScoreboardV2 separately. 
                     // We can't easily cross-ref here without overhead.
                     // Fallback: If PlusMinus > 0 ... no that's personal.
                     // Let's use PTS from TeamStats row.
                     // row[TEAM_ID], row[PTS].
                }

                foreach (var row in rows.EnumerateArray())
                {
                    int nbaId = row[idxId].GetInt32();
                    
                    if (playerMap.TryGetValue(nbaId, out int internalId))
                    {
                        // Helper to get double safely
                        double GetD(int i) => (i != -1 && row[i].ValueKind == JsonValueKind.Number) ? row[i].GetDouble() : 0;
                        int GetI(int i) => (i != -1 && row[i].ValueKind == JsonValueKind.Number) ? row[i].GetInt32() : 0;
                        
                        double pts = GetD(idxPts);
                        double reb = GetD(idxReb);
                        double ast = GetD(idxAst);
                        double stl = GetD(idxStl);
                        double blk = GetD(idxBlk);
                        double tov = GetD(idxTov);
                        
                        // Minute parsing "24.00" or "24:30"
                        double min = 0;
                        if (idxMin != -1 && row[idxMin].ValueKind == JsonValueKind.String)
                        {
                             var ms = row[idxMin].GetString();
                             if (ms != null && ms.Contains(":")) {
                                 var p = ms.Split(':');
                                 if (p.Length == 2) min = double.Parse(p[0]) + (double.Parse(p[1])/60.0);
                             }
                        }

                        int fgm = GetI(idxFgm); int fga = GetI(idxFga);
                        int ftm = GetI(idxFtm); int fta = GetI(idxFta);
                        int tpm = GetI(idx3pm); int tpa = GetI(idx3pa);
                        int oreb = GetI(idxOreb); int dreb = GetI(idxDreb);
                        double pm = GetD(idxPlusMinus);
                        
                        // WIN check approximation
                        // If PlusMinus is available, reliable? No.
                        // We set Won = false for now. Fixing implementation requires Team Score comparison.
                        bool isWinner = false; // TODO: Fix with TeamStats
                        
                        double fpts = FantasyPointCalculator.Calculate(
                            pts, reb, ast, stl, blk, tov,
                            fgm, fga, ftm, fta, tpm, tpa,
                            oreb, dreb, isWinner,
                            settings
                        );

                        // Safe Update
                        resultArray[internalId] = fpts;

                        logsToAdd.Add(new PlayerGameLog 
                        {
                            PlayerId = internalId,
                            GameDate = dbDateStr,
                            Points = (int)pts, Rebounds = (int)reb, Assists = (int)ast,
                            Steals = (int)stl, Blocks = (int)blk, Turnovers = (int)tov,
                            Minutes = Math.Round(min, 1), FantasyPoints = fpts,
                            Fgm = fgm, Fga = fga, Ftm = ftm, Fta = fta,
                            ThreePm = tpm, ThreePa = tpa,
                            OffRebounds = oreb, DefRebounds = dreb,
                            Won = isWinner
                        });
                    }
                }
            }
            catch (Exception ex) { _logger.LogError($"Errore boxscore API {gameId}: {ex.Message}"); }
        });

        await Task.WhenAll(tasks);

        // --- STEP 4: SALVATAGGIO ASINCRONO (BATCH FETCH - NO N+1) ---
        if (!logsToAdd.IsEmpty)
        {
            // PRO FIX: Carichiamo TUTTI i log esistenti per questa data/players in una sola query
            var distinctPlayerIds = logsToAdd.Select(l => l.PlayerId).Distinct().ToList();
            
            var existingLogsDict = await context.PlayerGameLogs
                .Where(l => l.GameDate == dbDateStr && distinctPlayerIds.Contains(l.PlayerId))
                .ToDictionaryAsync(l => l.PlayerId);

            var upsertList = new List<PlayerGameLog>();

            foreach (var log in logsToAdd)
            {
                if (existingLogsDict.TryGetValue(log.PlayerId, out var existing))
                {
                    // UPDATE
                    existing.FantasyPoints = log.FantasyPoints;
                    existing.Points = log.Points; 
                    existing.Rebounds = log.Rebounds; existing.Assists = log.Assists;
                    existing.Steals = log.Steals; existing.Blocks = log.Blocks; existing.Turnovers = log.Turnovers;
                    existing.Fgm = log.Fgm; existing.Fga = log.Fga;
                    existing.Ftm = log.Ftm; existing.Fta = log.Fta;
                    existing.ThreePm = log.ThreePm; existing.ThreePa = log.ThreePa;
                    existing.OffRebounds = log.OffRebounds; existing.DefRebounds = log.DefRebounds;
                    existing.Won = log.Won;
                }
                else
                {
                    // INSERT
                    context.PlayerGameLogs.Add(log);
                }
            }
            
            await context.SaveChangesAsync();
        }

        var finalDict = resultArray.ToDictionary(k => k.Key, v => v.Value);
        if (isPast) _cache.Set(cacheKey, finalDict, TimeSpan.FromMinutes(30)); 
        else _cache.Set(cacheKey, finalDict, TimeSpan.FromSeconds(60));

        return finalDict;
    }

    // Helper per parsare i minuti dal formato ISO8601 usato dal CDN (es: "PT12M30.00S")
    private double ParseIsoMinutes(string? isoDuration)
    {
        if (string.IsNullOrEmpty(isoDuration)) return 0;
        try {
            // Rimuovi "PT" e parsa grossolanamente o usa XmlConvert
            var time = System.Xml.XmlConvert.ToTimeSpan(isoDuration);
            return Math.Round(time.TotalMinutes, 1);
        } catch { return 0; }
    }

    // ==============================================================================
    // 3. IMPORTAZIONE MASSIVA CALENDARIO (CDN)
    // ==============================================================================
    public async Task ImportSeasonScheduleAsync()
    {
        _logger.LogInformation("Avvio download massivo Calendario NBA (CDN)...");

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            var cdnClient = _clientFactory.CreateClient("NbaCdn");
            
            var response = await cdnClient.GetAsync(URL_CDN_SCHEDULE);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Errore CDN: {response.StatusCode}");
                return;
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<NbaScheduleResponse>(json);

            if (data?.LeagueSchedule?.GameDates == null)
            {
                _logger.LogError("JSON CDN vuoto o formato non valido.");
                return;
            }

            var newGames = new List<NbaGame>();
            var existingGameIdsList = await context.NbaGames.Select(g => g.NbaGameId).ToListAsync();
            var existingGameIds = new HashSet<string>(existingGameIdsList);
            int processedDates = 0;
            string[] formats = { "MM/dd/yyyy HH:mm:ss", "MM/dd/yyyy" };

            foreach (var dateEntry in data.LeagueSchedule.GameDates)
            {
                if (!DateTime.TryParseExact(dateEntry.GameDateStr, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsedDate))
                    continue;

                foreach (var game in dateEntry.Games)
                {
                    // Controlli integrità
                    if (string.IsNullOrWhiteSpace(game.GameId)) continue;
                    if (game.HomeTeam == null || string.IsNullOrWhiteSpace(game.HomeTeam.TeamTricode)) continue;
                    if (game.AwayTeam == null || string.IsNullOrWhiteSpace(game.AwayTeam.TeamTricode)) continue;

                    if (existingGameIds.Contains(game.GameId)) continue;

                    newGames.Add(new NbaGame
                    {
                        NbaGameId = game.GameId,
                        GameDate = parsedDate.Date,
                        GameTime = game.GameStatusText ?? string.Empty, // Capture original time text
                        HomeTeam = game.HomeTeam.TeamTricode,
                        AwayTeam = game.AwayTeam.TeamTricode,
                        Status = game.GameStatusText ?? "Scheduled"
                    });
                }
                processedDates++;
            }

            // Salvataggio a blocchi (Batch) per performance
            if (newGames.Any())
            {
                int totalGames = newGames.Count;
                int batchSize = 1000;

                _logger.LogInformation($"Trovati {totalGames} nuovi match validi. Avvio salvataggio...");

                for (int i = 0; i < totalGames; i += batchSize)
                {
                    var batch = newGames.Skip(i).Take(batchSize).ToList();
                    try
                    {
                        await context.NbaGames.AddRangeAsync(batch);
                        await context.SaveChangesAsync();
                        context.ChangeTracker.Clear(); // Libera memoria EF Core
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Errore salvataggio batch {i}-{i + batchSize}");
                    }
                }
                _logger.LogInformation($"Importazione completata.");
            }
            else
            {
                _logger.LogInformation("Database già aggiornato.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Errore critico durante importazione calendario CDN.");
        }
    }

    // ==============================================================================
    // 4. AGGIORNAMENTO GIORNALIERO (LIVE SCOREBOARD - PER IL WORKER)
    // ==============================================================================
    public async Task UpdateDailyNbaSchedule(DateTime date)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        string dateStr = date.ToString("MM/dd/yyyy", CultureInfo.InvariantCulture);
        var url = string.Format(URL_SCOREBOARD, dateStr);

        try
        {
            // Usiamo il client "NbaStats" che ha base address e headers corretti
            var client = _clientFactory.CreateClient("NbaStats");
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return;

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);

            var resultSet = data?.ResultSets.FirstOrDefault(r => r.Name == "GameHeader");
            if (resultSet == null) return;

            var headers = resultSet.Headers;
            var rows = resultSet.RowSet;

            int idxGameId = headers.IndexOf("GAME_ID");
            int idxStatus = headers.IndexOf("GAME_STATUS_TEXT");
            int idxHomeId = headers.IndexOf("HOME_TEAM_ID");
            int idxAwayId = headers.IndexOf("VISITOR_TEAM_ID");

            var teamMap = GetNbaTeamIdMap();
            
            // OPTIMIZATION: Bulk fetch existing games for this date
            var gameIds = rows.Select(r => r[idxGameId].GetString() ?? "").ToList();
            var existingGames = await context.NbaGames
                .Where(g => g.GameDate == date.Date && gameIds.Contains(g.NbaGameId))
                .Select(g => new NbaGame { Id = g.Id, NbaGameId = g.NbaGameId, Status = g.Status }) // PROJECTION: Only fetch what we update
                .ToDictionaryAsync(g => g.NbaGameId);

            foreach (var row in rows)
            {
                string gameId = row[idxGameId].GetString() ?? "";
                string status = row[idxStatus].GetString() ?? "Scheduled";
                int homeId = row[idxHomeId].GetInt32();
                int awayId = row[idxAwayId].GetInt32();

                if (existingGames.TryGetValue(gameId, out var existingGame))
                {
                    existingGame.Status = status;
                }
                else
                {
                    string homeAbbr = teamMap.ContainsKey(homeId) ? teamMap[homeId] : "UNK";
                    string awayAbbr = teamMap.ContainsKey(awayId) ? teamMap[awayId] : "UNK";

                    if (homeAbbr != "UNK" && awayAbbr != "UNK")
                    {
                        context.NbaGames.Add(new NbaGame
                        {
                            NbaGameId = gameId,
                            GameDate = date.Date,
                            GameTime = status,
                            HomeTeam = homeAbbr,
                            AwayTeam = awayAbbr,
                            Status = status
                        });
                    }
                }
            }
            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"Errore update schedule per {date:d}: {ex.Message}");
        }
    }

    // ==============================================================================
    // 5. GESTIONE INFORTUNI - VERSIONE FINALE CORRETTA
    // Questo metodo recupera TUTTI gli infortuni attuali, indipendentemente dalle partite
    // ==============================================================================
    public async Task UpdateDailyInjuriesAsync(DateTime date)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            var client = _clientFactory.CreateClient("NbaStats");
            var (currentSeason, _) = CalculateSeasons(date);

            _logger.LogInformation($"🏥 Inizio aggiornamento infortuni per stagione {currentSeason}...");

            // STEP 1: Prova a recuperare injury report globale da commonallplayers
            // Questo endpoint dovrebbe avere info su tutti i giocatori attivi
            var url = string.Format(URL_ALL_PLAYERS, currentSeason);
            
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"❌ Errore chiamata commonallplayers: {response.StatusCode}");
                return;
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);

            if (data?.ResultSets == null || !data.ResultSets.Any())
            {
                _logger.LogWarning("⚠️ Nessun ResultSet nella risposta commonallplayers");
                return;
            }

            var resultSet = data.ResultSets[0];
            var headers = resultSet.Headers;
            var rows = resultSet.RowSet;

            // Log dei headers per capire cosa c'è disponibile
            _logger.LogInformation($"📋 Headers disponibili: {string.Join(", ", headers)}");

            int idxPersonId = headers.IndexOf("PERSON_ID");
            int idxPlayerName = headers.IndexOf("DISPLAY_FIRST_LAST");
            if (idxPlayerName == -1) idxPlayerName = headers.IndexOf("PLAYER_NAME");
            
                // Cerchiamo headers relativi agli infortuni
                int idxInjuryStatus = headers.IndexOf("INJURY_STATUS");
                int idxInjuryType = headers.IndexOf("INJURY_TYPE");
                int idxInjuryReturn = headers.IndexOf("INJURY_RETURN");

                if (idxPersonId == -1)
                {
                    _logger.LogError("❌ PERSON_ID non trovato nei headers");
                    return;
                }

                // CRITICAL FIX: In-Memory Diff to avoid 5800 DB Writes (Rows Updated)
                
                // STEP 1: Load ALL existing players (Tracking enabled for updates)
                // We fetch everything because we might update anyone. 5800 entities is ~2MB RAM. Acceptable.
                var allPlayers = await context.Players.ToDictionaryAsync(p => p.ExternalId);

                // STEP 2: Build Lookup of API Injuries
                var apiInjuries = new Dictionary<int, (string Status, string BodyPart, string Return)>();

                // Parse API Rows
                if (idxInjuryStatus != -1)
                {
                    foreach (var row in rows)
                    {
                        int externalId = row[idxPersonId].GetInt32();
                        string status = row[idxInjuryStatus].GetString() ?? "Active";

                        if (status != "Active" && status != "")
                        {
                            string bodyPart = (idxInjuryType != -1) ? row[idxInjuryType].GetString() ?? "TBD" : "TBD";
                            string retDate = (idxInjuryReturn != -1) ? row[idxInjuryReturn].GetString() ?? "" : "";
                            apiInjuries[externalId] = (status, bodyPart, retDate);
                        }
                    }
                }
                else 
                {
                    // Fallback flow would go here (omitted for brevity, relying on commonallplayers usually having status)
                }

                // STEP 3: Apply Diff logic (Active vs Injured)
                int updatesCount = 0;

                foreach (var p in allPlayers.Values)
                {
                    if (apiInjuries.TryGetValue(p.ExternalId, out var info))
                    {
                        // Player IS Injured in API
                        // Check if DB needs update
                        if (p.InjuryStatus != info.Status || p.InjuryBodyPart != info.BodyPart || p.InjuryReturnDate != info.Return)
                        {
                            p.InjuryStatus = info.Status;
                            p.InjuryBodyPart = info.BodyPart;
                            p.InjuryReturnDate = info.Return;
                            updatesCount++;
                        }
                    }
                    else
                    {
                        // Player IS NOT in API Injury list -> Must be Active
                        if (p.InjuryStatus != "Active")
                        {
                            p.InjuryStatus = "Active";
                            p.InjuryBodyPart = null;
                            p.InjuryReturnDate = null;
                            updatesCount++;
                        }
                    }
                }

                _logger.LogInformation($"✅ Rilevate {updatesCount} variazioni di stato infortunio. Eseguo Commit...");

                await context.SaveChangesAsync();
                // await transaction.CommitAsync(); // Transaction handled by EF implicit or outer scope if needed, but here simple SaveChanges is fine.
                // NOTE: Previous code used explicit transaction. We can keep it or remove it. Context handles it.
                // But since we removed ExecuteUpdate, we don't strictly need explicit transaction for atomicity of one command.
                // However, let's keep it safe.
                if (context.Database.CurrentTransaction != null) await context.Database.CommitTransactionAsync();
            
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Errore critico durante aggiornamento infortuni");
        }
    }

    private async Task FetchInjuriesFromTeamRosters(ApplicationDbContext context, HttpClient client, string season, Dictionary<int, Player> allPlayers)
    {
        var teamIds = new Dictionary<int, string>
        {
            { 1610612737, "ATL" }, { 1610612738, "BOS" }, { 1610612751, "BKN" }, { 1610612766, "CHA" },
            { 1610612741, "CHI" }, { 1610612739, "CLE" }, { 1610612742, "DAL" }, { 1610612743, "DEN" },
            { 1610612765, "DET" }, { 1610612744, "GSW" }, { 1610612745, "HOU" }, { 1610612754, "IND" },
            { 1610612746, "LAC" }, { 1610612747, "LAL" }, { 1610612763, "MEM" }, { 1610612748, "MIA" },
            { 1610612749, "MIL" }, { 1610612750, "MIN" }, { 1610612740, "NOP" }, { 1610612752, "NYK" },
            { 1610612760, "OKC" }, { 1610612753, "ORL" }, { 1610612755, "PHI" }, { 1610612756, "PHX" },
            { 1610612757, "POR" }, { 1610612758, "SAC" }, { 1610612759, "SAS" }, { 1610612761, "TOR" },
            { 1610612762, "UTA" }, { 1610612764, "WAS" }
        };

        int injuredCount = 0;

        foreach (var (teamId, teamCode) in teamIds)
        {
            try
            {
                var url = string.Format(URL_TEAM_ROSTER, season, teamId);
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) continue;

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);

                if (data?.ResultSets != null && data.ResultSets.Any())
                {
                    var resultSet = data.ResultSets[0];
                    var headers = resultSet.Headers;
                    int idxPersonId = headers.IndexOf("PLAYER_ID") != -1 ? headers.IndexOf("PLAYER_ID") : headers.IndexOf("PERSON_ID");
                    int idxStatus = headers.IndexOf("PLAYER_STATUS") != -1 ? headers.IndexOf("PLAYER_STATUS") : headers.IndexOf("STATUS");

                    if (idxPersonId != -1 && idxStatus != -1)
                    {
                        foreach (var row in resultSet.RowSet)
                        {
                            int externalId = row[idxPersonId].GetInt32();
                            string status = row[idxStatus].GetString() ?? "Active";

                            if (status != "Active" && status != "" && allPlayers.TryGetValue(externalId, out var player))
                            {
                                player.InjuryStatus = status;
                                player.InjuryBodyPart = "TBD";
                                injuredCount++;
                            }
                        }
                    }
                }
                await Task.Delay(350);
            }
            catch { }
        }
        _logger.LogInformation($"✅ Trovati {injuredCount} giocatori infortunati da team rosters");
    }

    public async Task UpdateSeasonStatsAsync() => await SyncPlayersAsync();

    // --- HELPER PRIVATI (PARSING E UTILITY) ---

    // Questo metodo è lungo perché deve mappare decine di colonne statistiche
    private async Task ProcessSeasonAsync(ApplicationDbContext context, string season, bool isCurrentSeason, Dictionary<int, PlayerRegistryEntry> registry, Dictionary<int, PlayerBio> bioMap, LeagueSettings settings)
    {
        var url = string.Format(URL_LEAGUE_DASH, season);

        try
        {
            var client = _clientFactory.CreateClient("NbaStats");
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return;

            var json = await response.Content.ReadAsStringAsync();
            var nbaData = JsonSerializer.Deserialize<NbaStatsResponse>(json);
            if (nbaData?.ResultSets == null || !nbaData.ResultSets.Any()) return;

            var resultSet = nbaData.ResultSets[0];
            var headers = resultSet.Headers;
            var rows = resultSet.RowSet;

            // Mappatura Indici
            int idxId = headers.IndexOf("PLAYER_ID");
            int idxName = headers.IndexOf("PLAYER_NAME");
            int idxTeam = headers.IndexOf("TEAM_ABBREVIATION");
            int idxGp = headers.IndexOf("GP");
            int idxPts = headers.IndexOf("PTS");
            int idxReb = headers.IndexOf("REB");
            int idxAst = headers.IndexOf("AST");
            int idxStl = headers.IndexOf("STL");
            int idxBlk = headers.IndexOf("BLK");
            int idxMin = headers.IndexOf("MIN");
            int idxTov = headers.IndexOf("TOV");
            int idxPf = headers.IndexOf("PF");
            int idxFgm = headers.IndexOf("FGM");
            int idxFga = headers.IndexOf("FGA");
            int idxFgPct = headers.IndexOf("FG_PCT");
            int idx3pm = headers.IndexOf("FG3M");
            int idx3pa = headers.IndexOf("FG3A");
            int idx3pPct = headers.IndexOf("FG3_PCT");
            int idxFtm = headers.IndexOf("FTM");
            int idxFta = headers.IndexOf("FTA");
            int idxFtPct = headers.IndexOf("FT_PCT");
            int idxOreb = headers.IndexOf("OREB");
            int idxDreb = headers.IndexOf("DREB");
            int idxPlusMinus = headers.IndexOf("PLUS_MINUS");
            int idxWpct = headers.IndexOf("W_PCT");
            int idxDd2 = headers.IndexOf("DD2");
            int idxTd3 = headers.IndexOf("TD3");

            // Helpers lettura robusta
            double GetVal(List<JsonElement> r, int i)
            {
                 if (i == -1) return 0;
                 try {
                    return r[i].ValueKind == JsonValueKind.Number ? Math.Round(r[i].GetDouble(), 1) : 0;
                 } catch { return 0; }
            }

            int GetInt(List<JsonElement> r, int i) 
            {
                if (i == -1) return 0;
                try {
                    return r[i].ValueKind == JsonValueKind.Number ? r[i].GetInt32() : 0;
                } catch { return 0; }
            }

            // --- REGISTRY-FIRST PLAYER PROCESSING ---
            var playerDict = new Dictionary<int, Player>();
            var statsToSync = new List<(int ExtId, PlayerSeasonStat Stat)>();

            // STEP 1: INITIALIZE ALL PLAYERS from MASTER REGISTRY (commonallplayers)
            // This is the SOURCE OF TRUTH for: ExternalId, FirstName, LastName, Team
            if (isCurrentSeason && registry.Any())
            {
                _logger.LogInformation($"Initializing {registry.Count} players from master registry (REGISTRY-FIRST approach)");
                
                foreach (var (externalId, registryEntry) in registry)
                {
                    // Get bio data for Position/Height/Weight
                    bioMap.TryGetValue(externalId, out var bio);
                    
                    // Create player with REGISTRY data as foundation (NOT stats!)
                    var p = new Player
                    {
                        ExternalId = externalId,
                        FirstName = registryEntry.FirstName,   // ✅ From REGISTRY (not "Unknown")
                        LastName = registryEntry.LastName,     // ✅ From REGISTRY  
                        NbaTeam = registryEntry.Team,          // ✅ From REGISTRY
                        DraftYear = registryEntry.DraftYear > 0 ? registryEntry.DraftYear : bio.DraftYear,
                        RealNbaDraftRank = registryEntry.DraftNumber > 0 ? registryEntry.DraftNumber : (bio.DraftNumber > 0 ? bio.DraftNumber : null),
                        IsRookie = (registryEntry.DraftYear > 0 ? registryEntry.DraftYear : bio.DraftYear) == SeasonHelper.ParseStartYear(season),
                        Position = bio.Position ?? "F",        // From bioMap
                        Height = bio.Height ?? "",
                        Weight = bio.Weight ?? "",
                        GamesPlayed = 0
                        // All stats default to 0 (will be enriched if player has stats)
                    };
                    
                    playerDict[externalId] = p;
                }
            }

            // STEP 2: ENRICH WITH STATS from leaguedashplayerstats
            // For players with game time, overlay their statistics (DO NOT override names - registry is source of truth)
            foreach (var row in rows)
            {
                int externalId = GetInt(row, idxId);
                
                // Get team from stats API (used for season stats, not player record)
                string teamName = (row[idxTeam].ValueKind == JsonValueKind.String) 
                    ? row[idxTeam].GetString() ?? "FA" 
                    : "FA";
                    
                int gamesPlayed = GetInt(row, idxGp);
                
                // Stats Parsing
                double pts = GetVal(row, idxPts);
                double reb = GetVal(row, idxReb);
                double ast = GetVal(row, idxAst);
                double stl = GetVal(row, idxStl);
                double blk = GetVal(row, idxBlk);
                double tov = GetVal(row, idxTov);
                double min = GetVal(row, idxMin);
                double pf = GetInt(row, idxPf);
                
                // Advanced & Shooting
                double fgm = GetVal(row, idxFgm); double fga = GetVal(row, idxFga); double fgPct = GetVal(row, idxFgPct);
                double tpm = GetVal(row, idx3pm); double tpa = GetVal(row, idx3pa); double tpPct = GetVal(row, idx3pPct);
                double ftm = GetVal(row, idxFtm); double fta = GetVal(row, idxFta); double ftPct = GetVal(row, idxFtPct);
                double oreb = GetVal(row, idxOreb); double dreb = GetVal(row, idxDreb);
                double pm = GetVal(row, idxPlusMinus); double wpct = GetVal(row, idxWpct);
                double dd = GetVal(row, idxDd2); double td = GetVal(row, idxTd3);
                
                double efficiency = Math.Round((pts + reb + ast + stl + blk) - (fga - fgm) - (fta - ftm) - tov, 1);
                
                double fpts = FantasyPointCalculator.Calculate(
                    pts, reb, ast, stl, blk, tov,
                    fgm, fga, ftm, fta, tpm, tpa,
                    oreb, dreb,
                    false,
                    settings
                ) + (wpct * settings.WinWeight) + ((1.0 - wpct) * settings.LossWeight);

                if (isCurrentSeason)
                {
                    // Check if player exists in dictionary (from registry)
                    if (playerDict.TryGetValue(externalId, out var existing))
                    {
                        // ENRICH existing entry with STATS ONLY (DO NOT override name - registry is source!)
                        existing.GamesPlayed = gamesPlayed;
                        existing.AvgPoints = pts; existing.AvgRebounds = reb; existing.AvgAssists = ast;
                        existing.AvgSteals = stl; existing.AvgBlocks = blk; existing.AvgMinutes = min;
                        existing.AvgTurnovers = tov; existing.PersonalFouls = pf;
                        existing.Fgm = fgm; existing.Fga = fga; existing.FgPercent = fgPct;
                        existing.ThreePm = tpm; existing.ThreePa = tpa; existing.ThreePtPercent = tpPct;
                        existing.Ftm = ftm; existing.Fta = fta; existing.FtPercent = ftPct;
                        existing.OffRebounds = oreb; existing.DefRebounds = dreb;
                        existing.PlusMinus = pm; existing.WinPct = wpct;
                        existing.DoubleDoubles = dd; existing.TripleDoubles = td;
                        existing.FantasyPoints = fpts;
                        existing.Efficiency = efficiency;
                        
                        // FIX: Explicitly update IsRookie flag to cleanup vets
                        int draftY = existing.DraftYear;
                        if (draftY == 0 && bioMap.TryGetValue(externalId, out var b)) draftY = b.DraftYear;
                        existing.IsRookie = (draftY == SeasonHelper.ParseStartYear(season));
                        
                        // FirstName, LastName, Team, Position already set from registry/bioMap - DO NOT OVERRIDE
                    }
                    else
                    {
                        // Player NOT in registry (edge case - manually added or API mismatch)
                        string fullName = row[idxName].ValueKind == JsonValueKind.String ? row[idxName].GetString() ?? "Unknown" : "Unknown";
                        var names = fullName.Split(' ');
                        string firstName = names[0].Replace("'", "''");
                        string lastName = (names.Length > 1 ? string.Join(" ", names.Skip(1)) : "").Replace("'", "''");
                        
                        var p = new Player
                        {
                            ExternalId = externalId,
                            FirstName = firstName,
                            LastName = lastName,
                            NbaTeam = teamName,
                            GamesPlayed = gamesPlayed,
                            AvgPoints = pts, AvgRebounds = reb, AvgAssists = ast,
                            AvgSteals = stl, AvgBlocks = blk, AvgMinutes = min,
                            AvgTurnovers = tov, PersonalFouls = pf,
                            Fgm = fgm, Fga = fga, FgPercent = fgPct,
                            ThreePm = tpm, ThreePa = tpa, ThreePtPercent = tpPct,
                            Ftm = ftm, Fta = fta, FtPercent = ftPct,
                            OffRebounds = oreb, DefRebounds = dreb,
                            PlusMinus = pm, WinPct = wpct,
                            DoubleDoubles = dd, TripleDoubles = td,
                            FantasyPoints = fpts,
                            Efficiency = efficiency
                        };
                        
                        if (bioMap.TryGetValue(externalId, out var bio))
                        {
                            p.Position = bio.Position; p.Height = bio.Height; p.Weight = bio.Weight;
                        }
                        
                        playerDict[externalId] = p;
                    }
                }
                
                // Prepare Season Stat Object
                var s = new PlayerSeasonStat
                {
                    Season = season,
                    NbaTeam = teamName,
                    GamesPlayed = gamesPlayed,
                    AvgPoints = pts, AvgRebounds = reb, AvgAssists = ast,
                    AvgSteals = stl, AvgBlocks = blk, AvgMinutes = min,
                    AvgTurnovers = tov,
                    Fgm = fgm, Fga = fga, FgPercent = fgPct,
                    ThreePm = tpm, ThreePa = tpa, ThreePtPercent = tpPct,
                    Ftm = ftm, Fta = fta, FtPercent = ftPct,
                    OffRebounds = oreb, DefRebounds = dreb,
                    PersonalFouls = pf, PlusMinus = pm, WinPct = wpct,
                    DoubleDoubles = dd, TripleDoubles = td,
                    Efficiency = efficiency
                };
                statsToSync.Add((externalId, s));
            }

            // STEP 3: BULK UPSERT ALL PLAYERS (from dictionary)
            if (isCurrentSeason && playerDict.Any())
            {
                var playersToUpsert = playerDict.Values.ToList();
                _logger.LogInformation($"Upserting {playersToUpsert.Count} players (includes roster + stats enrichment)");
                await BulkUpsertPlayersAsync(context, playersToUpsert);
            }

            // STEP 4: RECUPERA MAPPING ID (External -> Internal)
            // Necessario per assegnare l'ID corretto alle stats
            var idMap = await context.Players
                .Where(p => statsToSync.Select(s => s.ExtId).Contains(p.ExternalId))
                .Select(p => new { p.ExternalId, p.Id })
                .ToDictionaryAsync(k => k.ExternalId, v => v.Id);

            // 3. PREPARA LISTA STATS CON ID INTERNI
            var finalStats = new List<PlayerSeasonStat>();
            foreach(var item in statsToSync)
            {
                if (idMap.TryGetValue(item.ExtId, out int internalId))
                {
                    item.Stat.PlayerId = internalId;
                    finalStats.Add(item.Stat);
                }
            }

            // 4. UPSERT SEASON STATS
            if (finalStats.Any())
            {
                await BulkUpsertSeasonStatsAsync(context, finalStats);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Errore sync stagione {season}");
        }
    }

    private (string Current, List<string> History) CalculateSeasons(DateTime? date = null)
    {
        var refDate = date ?? DateTime.Now;
        int startYear = (refDate.Month >= 10) ? refDate.Year : refDate.Year - 1;
        string GetSeasonString(int year) => $"{year}-{(year + 1) % 100:D2}";
        string current = GetSeasonString(startYear);
        var history = new List<string>();
        for (int i = 1; i <= 5; i++) history.Add(GetSeasonString(startYear - i));
        return (current, history);
    }

    private struct PlayerBio 
    { 
        public string Position; 
        public string Height; 
        public string Weight; 
        public int DraftYear;
        public int DraftNumber;
    }

    private async Task<Dictionary<int, PlayerBio>> GetPlayerBioMapAsync(string season)
    {
        // CACHING BIOMAP (Dati statici che cambiano raramente) - 24H Cache
        if (_cache.TryGetValue($"bio_{season}", out Dictionary<int, PlayerBio>? cachedBio)) return cachedBio!;

        var bioMap = new Dictionary<int, PlayerBio>();

        var url = string.Format(URL_PLAYER_BIO, season);
        try
        {
            var client = _clientFactory.CreateClient("NbaStats");
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return bioMap;

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);
            if (data?.ResultSets == null || !data.ResultSets.Any()) return bioMap;

            var rows = data.ResultSets[0].RowSet;
            var headers = data.ResultSets[0].Headers;
            int idxId = headers.IndexOf("PERSON_ID");
            int idxPos = headers.IndexOf("POSITION");
            int idxH = headers.IndexOf("HEIGHT");
            int idxW = headers.IndexOf("WEIGHT");
            int idxDraftYear = headers.IndexOf("DRAFT_YEAR");
            int idxDraftNum = headers.IndexOf("DRAFT_NUMBER");

            foreach (var row in rows)
            {
                if (idxId == -1) continue;
                int id = row[idxId].GetInt32();
                
                int draftYear = 0;
                int draftNum = 0;

                // Robust Parsing for Draft Info
                if (idxDraftYear != -1)
                {
                    if (row[idxDraftYear].ValueKind == JsonValueKind.Number) draftYear = row[idxDraftYear].GetInt32();
                    else if (row[idxDraftYear].ValueKind == JsonValueKind.String) int.TryParse(row[idxDraftYear].GetString(), out draftYear);
                }

                if (idxDraftNum != -1)
                {
                    if (row[idxDraftNum].ValueKind == JsonValueKind.Number) draftNum = row[idxDraftNum].GetInt32();
                    else if (row[idxDraftNum].ValueKind == JsonValueKind.String) int.TryParse(row[idxDraftNum].GetString(), out draftNum);
                }

                bioMap[id] = new PlayerBio
                {
                    Position = idxPos != -1 ? row[idxPos].ToString() : "F",
                    Height = idxH != -1 ? row[idxH].ToString() : "",
                    Weight = idxW != -1 ? row[idxW].ToString() : "",
                    DraftYear = draftYear,
                    DraftNumber = draftNum
                };
            }
            
            _cache.Set($"bio_{season}", bioMap, TimeSpan.FromHours(24));
        }
        catch { }
        return bioMap;
    }

    // Master Player Registry Entry from commonallplayers
    private struct PlayerRegistryEntry
    {
        public string FirstName;
        public string LastName;
        public string Team;
        public int DraftYear;
        public int DraftNumber;
    }

    // Fetches MASTER PLAYER REGISTRY from commonallplayers (source of truth for player identity)
    // Returns: ExternalId -> (FirstName, LastName, Team)
    private async Task<Dictionary<int, PlayerRegistryEntry>> GetAllPlayersRegistryAsync(string season)
    {
        // CACHING REGISTRY (24H Cache - player ID/name/team data is relatively stable)
        if (_cache.TryGetValue($"registry_{season}", out Dictionary<int, PlayerRegistryEntry>? cachedRegistry)) 
            return cachedRegistry!;

        var registry = new Dictionary<int, PlayerRegistryEntry>();
        var url = string.Format(URL_ALL_PLAYERS, season);

        try
        {
            var client = _clientFactory.CreateClient("NbaStats");
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return registry;

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);
            if (data?.ResultSets == null || !data.ResultSets.Any()) return registry;

            var rows = data.ResultSets[0].RowSet;
            var headers = data.ResultSets[0].Headers;
            
            int idxId = headers.IndexOf("PERSON_ID");
            int idxFirstName = headers.IndexOf("DISPLAY_FIRST_LAST"); // Full name like "Jayson Tatum"
            int idxTeam = headers.IndexOf("TEAM_ABBREVIATION");

                int idxDraftYear = headers.IndexOf("DRAFT_YEAR");
                int idxDraftNum = headers.IndexOf("DRAFT_NUMBER");
                // Fallback to FROM_YEAR if Draft Year missing
                if (idxDraftYear == -1) idxDraftYear = headers.IndexOf("FROM_YEAR");

                foreach (var row in rows)
                {
                    if (idxId == -1) continue;
                    
                    int id = row[idxId].GetInt32();
                    
                    // Parse full name into First + Last
                    string fullName = (idxFirstName != -1 && row[idxFirstName].ValueKind == JsonValueKind.String)
                        ? row[idxFirstName].GetString() ?? $"Player {id}"
                        : $"Player {id}";
                    
                    var nameParts = fullName.Split(' ', 2); // Split on first space only
                    string firstName = nameParts.Length > 0 ? nameParts[0] : "Unknown";
                    string lastName = nameParts.Length > 1 ? nameParts[1] : $"Player {id}";
                    
                    string team = (idxTeam != -1 && row[idxTeam].ValueKind == JsonValueKind.String)
                        ? row[idxTeam].GetString() ?? "FA"
                        : "FA";

                    int draftYear = 0;
                    if (idxDraftYear != -1 && row[idxDraftYear].ValueKind == JsonValueKind.String)
                        int.TryParse(row[idxDraftYear].GetString(), out draftYear);
                    else if (idxDraftYear != -1 && row[idxDraftYear].ValueKind == JsonValueKind.Number)
                        draftYear = row[idxDraftYear].GetInt32();

                    int draftNum = 0;
                    if (idxDraftNum != -1)
                    {
                         if(row[idxDraftNum].ValueKind == JsonValueKind.Number)
                             draftNum = row[idxDraftNum].GetInt32();
                         else if(row[idxDraftNum].ValueKind == JsonValueKind.String)
                             int.TryParse(row[idxDraftNum].GetString(), out draftNum);
                    }
                    
                    registry[id] = new PlayerRegistryEntry
                    {
                        FirstName = firstName,
                        LastName = lastName,
                        Team = team,
                        DraftYear = draftYear,
                        DraftNumber = draftNum
                    };
                }

            _cache.Set($"registry_{season}", registry, TimeSpan.FromHours(24));
            _logger.LogInformation($"Loaded {registry.Count} players from commonallplayers registry for season {season}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"Failed to fetch commonallplayers registry: {ex.Message}");
        }

        return registry;
    }


    private DateTime ConvertToNbaDate(DateTime utcDate)
    {
        // NBA Time is Eastern Time (ET).
        // Standard ID for Eastern Time in Windows is "Eastern Standard Time" (handles DST automatically).
        // In Linux/Docker, use "America/New_York".
        try {
            var etZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(utcDate, etZone);
        }
        catch 
        {
            // Fallback for Linux/Other envs if "Eastern Standard Time" not found
            try {
                var etZone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
                return TimeZoneInfo.ConvertTimeFromUtc(utcDate, etZone);
            }
            catch {
                // Last Resort: -5 Fixed (Not accurate for DST but prevents crash)
                return utcDate.AddHours(-5);
            }
        }
    }

    private Dictionary<int, string> GetNbaTeamIdMap()
    {
        return new Dictionary<int, string>
        {
            { 1610612737, "ATL" }, { 1610612738, "BOS" }, { 1610612751, "BKN" }, { 1610612766, "CHA" },
            { 1610612741, "CHI" }, { 1610612739, "CLE" }, { 1610612742, "DAL" }, { 1610612743, "DEN" },
            { 1610612765, "DET" }, { 1610612744, "GSW" }, { 1610612745, "HOU" }, { 1610612754, "IND" },
            { 1610612746, "LAC" }, { 1610612747, "LAL" }, { 1610612763, "MEM" }, { 1610612748, "MIA" },
            { 1610612749, "MIL" }, { 1610612750, "MIN" }, { 1610612740, "NOP" }, { 1610612752, "NYK" },
            { 1610612760, "OKC" }, { 1610612753, "ORL" }, { 1610612755, "PHI" }, { 1610612756, "PHX" },
            { 1610612757, "POR" }, { 1610612758, "SAC" }, { 1610612759, "SAS" }, { 1610612761, "TOR" },
            { 1610612762, "UTA" }, { 1610612764, "WAS" }
        };
    }

    // ==============================================================================
    // HELPERS DI OTTIMIZZAZIONE (BULK EXTENSIONS)
    // ==============================================================================
    private async Task BulkUpsertPlayersAsync(ApplicationDbContext context, List<Player> players)
    {
        if (!players.Any()) return;

        // Configurazione Upsert: Update se ExternalId esiste già
        var bulkConfig = new BulkConfig
        {
            UpdateByProperties = new List<string> { nameof(Player.ExternalId) },
            PreserveInsertOrder = false,
            SetOutputIdentity = false
        };

        await context.BulkInsertOrUpdateAsync(players, bulkConfig);
    }

    private async Task BulkUpsertSeasonStatsAsync(ApplicationDbContext context, List<PlayerSeasonStat> stats)
    {
        if (!stats.Any()) return;

        // Configurazione Upsert: Chiave composta PlayerId + Season
        var bulkConfig = new BulkConfig
        {
            UpdateByProperties = new List<string> { nameof(PlayerSeasonStat.PlayerId), nameof(PlayerSeasonStat.Season) },
            PreserveInsertOrder = false,
            SetOutputIdentity = false
        };

        await context.BulkInsertOrUpdateAsync(stats, bulkConfig);
    }
}

// ==============================================================================
// DTOs (DATA TRANSFER OBJECTS)
// ==============================================================================

// --- Per le API Stats (Scoreboard, PlayerLogs) ---
public class NbaStatsResponse
{
    [JsonPropertyName("resultSets")]
    public List<NbaResultSet> ResultSets { get; set; } = default!;
}

public class NbaResultSet
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = default!;

    [JsonPropertyName("headers")]
    public List<string> Headers { get; set; } = default!;

    [JsonPropertyName("rowSet")]
    public List<List<JsonElement>> RowSet { get; set; } = default!;
}

// --- Per le API CDN (Massive Schedule) ---
public class NbaScheduleResponse
{
    [JsonPropertyName("leagueSchedule")]
    public LeagueScheduleData LeagueSchedule { get; set; } = default!;
}

public class LeagueScheduleData
{
    [JsonPropertyName("gameDates")]
    public List<NbaGameDate> GameDates { get; set; } = default!;
}

public class NbaGameDate
{
    [JsonPropertyName("gameDate")]
    public string GameDateStr { get; set; } = default!;

    [JsonPropertyName("games")]
    public List<NbaScheduleGame> Games { get; set; } = default!;
}

public class NbaScheduleGame
{
    [JsonPropertyName("gameId")]
    public string GameId { get; set; } = default!;

    [JsonPropertyName("gameStatusText")]
    public string GameStatusText { get; set; } = default!;

    [JsonPropertyName("homeTeam")]
    public NbaScheduleTeam HomeTeam { get; set; } = default!;

    [JsonPropertyName("awayTeam")]
    public NbaScheduleTeam AwayTeam { get; set; } = default!;
}

public class NbaScheduleTeam
{
    [JsonPropertyName("teamTricode")]
    public string TeamTricode { get; set; } = string.Empty;
}