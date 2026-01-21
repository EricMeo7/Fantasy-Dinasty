using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using EFCore.BulkExtensions;

namespace FantasyBasket.API.Services;

public class NbaDataService : INbaDataService
{
    private readonly IHttpClientFactory _clientFactory;
    private readonly IMemoryCache _cache;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NbaDataService> _logger;

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

        // 1. Scarica mappa dati fisici (Altezza/Peso/Ruolo)
        var bioMap = await GetPlayerBioMapAsync(currentSeason);

        // 2. Processa stagione corrente (Aggiorna tabella Players)
        await ProcessSeasonAsync(context, currentSeason, isCurrentSeason: true, bioMap);

        // 3. Processa storico (Aggiorna tabella PlayerSeasonStats per gli ultimi 5 anni)
        // OTTIMIZZAZIONE: Esegui solo il 1° del mese per risparmiare bandwidth
        if (DateTime.UtcNow.Day == 1)
        {
            foreach (var season in historySeasons)
            {
                _logger.LogInformation($"Sync Storico: {season}...");
                await ProcessSeasonAsync(context, season, isCurrentSeason: false, bioMap);
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
        var gamesToday = await context.NbaGames
            .Where(g => g.GameDate == nbaDate.Date)
            .Select(g => g.NbaGameId)
            .ToListAsync();

        if (!gamesToday.Any()) return resultArray.ToDictionary(k => k.Key, v => v.Value);

        var client = _clientFactory.CreateClient("NbaCdn");
        var logsToAdd = new System.Collections.Concurrent.ConcurrentBag<PlayerGameLog>();
        
        var playerMap = await context.Players
            .Where(p => internalPlayerIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.ExternalId, p => p.Id);

        var tasks = gamesToday.Select(async gameId => 
        {
            try 
            {
                var url = string.Format(URL_CDN_BOXSCORE, gameId);
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var game = doc.RootElement.GetProperty("game");
                var homeNode = game.GetProperty("homeTeam");
                var awayNode = game.GetProperty("awayTeam");
                
                int homeScore = homeNode.GetProperty("score").GetInt32();
                int awayScore = awayNode.GetProperty("score").GetInt32();

                void ProcessTeam(JsonElement teamNode, bool isWinner)
                {
                    if (!teamNode.TryGetProperty("players", out var players)) return;

                    foreach (var p in players.EnumerateArray())
                    {
                        int nbaId = p.GetProperty("personId").GetInt32();
                        
                        if (playerMap.TryGetValue(nbaId, out int internalId))
                        {
                            var stats = p.GetProperty("statistics");
                            
                            double pts = stats.GetProperty("points").GetDouble();
                            double reb = stats.GetProperty("reboundsTotal").GetDouble();
                            double ast = stats.GetProperty("assists").GetDouble();
                            double stl = stats.GetProperty("steals").GetDouble();
                            double blk = stats.GetProperty("blocks").GetDouble();
                            double tov = stats.GetProperty("turnovers").GetDouble();
                            
                            string minStr = stats.GetProperty("minutesCalculated").GetString(); 
                            double min = ParseIsoMinutes(minStr); 

                            int fgm = (int)stats.GetProperty("fieldGoalsMade").GetDouble();
                            int fga = (int)stats.GetProperty("fieldGoalsAttempted").GetDouble();
                            int ftm = (int)stats.GetProperty("freeThrowsMade").GetDouble();
                            int fta = (int)stats.GetProperty("freeThrowsAttempted").GetDouble();
                            int tpm = (int)stats.GetProperty("threePointersMade").GetDouble();
                            int tpa = (int)stats.GetProperty("threePointersAttempted").GetDouble();
                            int oreb = (int)stats.GetProperty("reboundsOffensive").GetDouble();
                            int dreb = (int)stats.GetProperty("reboundsDefensive").GetDouble();

                            double fpts = Math.Round(pts + (reb * 1.2) + (ast * 1.5) + (stl * 3) + (blk * 3) - tov, 1);

                            // Aggiorna Risultato (Thread-Safe)
                            resultArray[internalId] = fpts;

                            // Aggiungi Log (Thread-Safe) - Upsert logico verrà fatto dopo
                            logsToAdd.Add(new PlayerGameLog 
                            {
                                PlayerId = internalId,
                                GameDate = dbDateStr,
                                Points = (int)pts, Rebounds = (int)reb, Assists = (int)ast,
                                Steals = (int)stl, Blocks = (int)blk, Turnovers = (int)tov,
                                Minutes = min, FantasyPoints = fpts,
                                Fgm = fgm, Fga = fga, Ftm = ftm, Fta = fta,
                                ThreePm = tpm, ThreePa = tpa,
                                OffRebounds = oreb, DefRebounds = dreb,
                                Won = isWinner
                            });
                        }
                    }
                }

                ProcessTeam(homeNode, homeScore > awayScore);
                ProcessTeam(awayNode, awayScore > homeScore);
            }
            catch (Exception ex) { _logger.LogError($"Errore boxscore {gameId}: {ex.Message}"); }
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
    private double ParseIsoMinutes(string isoDuration)
    {
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
                        GameTime = game.GameStatusText, // Capture original time text
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

            foreach (var row in rows)
            {
                string gameId = row[idxGameId].GetString() ?? "";
                string status = row[idxStatus].GetString() ?? "Scheduled";
                int homeId = row[idxHomeId].GetInt32();
                int awayId = row[idxAwayId].GetInt32();

                var existingGame = await context.NbaGames.FirstOrDefaultAsync(g => g.NbaGameId == gameId);

                if (existingGame != null)
                {
                    existingGame.Status = status; // Aggiorna stato (Live/Final)
                }
                else
                {
                    // Fallback di sicurezza: se non c'era nel CDN, lo creiamo
                    string homeAbbr = teamMap.ContainsKey(homeId) ? teamMap[homeId] : "UNK";
                    string awayAbbr = teamMap.ContainsKey(awayId) ? teamMap[awayId] : "UNK";

                    if (homeAbbr != "UNK" && awayAbbr != "UNK")
                    {
                        context.NbaGames.Add(new NbaGame
                        {
                            NbaGameId = gameId,
                            GameDate = date.Date,
                            GameTime = status, // Use status as time if logic holds (often status is time for future games)
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
            // Le API NBA potrebbero non avere questi dati in commonallplayers
            // Potrebbero usare nomi come: INJURY_STATUS, PLAYER_STATUS, ecc.
            int idxInjuryStatus = headers.IndexOf("INJURY_STATUS");
            int idxInjuryType = headers.IndexOf("INJURY_TYPE");
            int idxInjuryReturn = headers.IndexOf("INJURY_RETURN");

            if (idxPersonId == -1)
            {
                _logger.LogError("❌ PERSON_ID non trovato nei headers");
                return;
            }

            // CRITICAL FIX: Transazione per atomicità
            using var transaction = await context.Database.BeginTransactionAsync();
            try 
            {
                // STEP 2: Reset tutti i giocatori ad "Active" prima dell'update
            // STEP 2: Reset tutti i giocatori ad "Active" prima dell'update
            // OPTIMIZATION: Use ExecuteUpdateAsync to reset without unnecessary fetching
            await context.Players.ExecuteUpdateAsync(s => s
                .SetProperty(p => p.InjuryStatus, "Active")
                .SetProperty(p => p.InjuryBodyPart, (string?)null)
                .SetProperty(p => p.InjuryReturnDate, (string?)null));

            _logger.LogInformation($"✅ Reset giocatori ad Active (ExecuteUpdateAsync)");

            // STEP 3: FALLBACK - Se commonallplayers non ha injury data, usa team rosters
            if (idxInjuryStatus == -1)
            {
                _logger.LogWarning("⚠️ commonallplayers non ha dati injury. Usando fallback team-by-team...");
                await FetchInjuriesFromTeamRosters(context, client, currentSeason);
            }
            else
            {
                // Parse injury data from commonallplayers
                int injuredCount = 0;
                
                foreach (var row in rows)
                {
                    int externalId = row[idxPersonId].GetInt32();
                    
                    string injuryStatus = idxInjuryStatus != -1 && row[idxInjuryStatus].ValueKind == JsonValueKind.String 
                        ? row[idxInjuryStatus].GetString() ?? "Active" 
                        : "Active";
                    
                    if (injuryStatus != "Active" && injuryStatus != "")
                    {
                        var player = await context.Players.FirstOrDefaultAsync(p => p.ExternalId == externalId);
                        if (player != null)
                        {
                            player.InjuryStatus = injuryStatus;
                            
                            if (idxInjuryType != -1 && row[idxInjuryType].ValueKind == JsonValueKind.String)
                                player.InjuryBodyPart = row[idxInjuryType].GetString();
                            
                            if (idxInjuryReturn != -1 && row[idxInjuryReturn].ValueKind == JsonValueKind.String)
                                player.InjuryReturnDate = row[idxInjuryReturn].GetString();
                            
                            injuredCount++;
                        }
                    }
                }

                _logger.LogInformation($"✅ Trovati {injuredCount} giocatori infortunati da commonallplayers");
                
                // SANITY CHECK (DATA INTEGRITY)
                if (injuredCount == 0)
                {
                    throw new InvalidOperationException("⚠️ Sanity Check Failed: 0 infortunati trovati. Rollback preventivo per evitare data loss.");
                }
            }

                await context.SaveChangesAsync();
                await transaction.CommitAsync();
                _logger.LogInformation("✅ Aggiornamento infortuni completato (COMMIT)");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "❌ Errore Transaction Infortuni. Eseguito Rollback.");
                throw; 
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Errore critico durante aggiornamento infortuni");
        }
    }

    // Metodo fallback: scansiona i roster di tutti i 30 team
    private async Task FetchInjuriesFromTeamRosters(ApplicationDbContext context, HttpClient client, string season)
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

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning($"⚠️ Errore fetch roster {teamCode}: {response.StatusCode}");
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<NbaStatsResponse>(json);

                if (data?.ResultSets != null && data.ResultSets.Any())
                {
                    var resultSet = data.ResultSets[0];
                    var headers = resultSet.Headers;
                    
                    int idxPersonId = headers.IndexOf("PLAYER_ID");
                    if (idxPersonId == -1) idxPersonId = headers.IndexOf("PERSON_ID");
                    
                    // Cerca colonne injury (potrebbero variare)
                    int idxStatus = headers.IndexOf("PLAYER_STATUS");
                    if (idxStatus == -1) idxStatus = headers.IndexOf("STATUS");

                    if (idxPersonId != -1 && idxStatus != -1)
                    {
                        foreach (var row in resultSet.RowSet)
                        {
                            int externalId = row[idxPersonId].GetInt32();
                            string status = row[idxStatus].GetString() ?? "Active";

                            if (status != "Active" && status != "")
                            {
                                var player = await context.Players.FirstOrDefaultAsync(p => p.ExternalId == externalId);
                                if (player != null)
                                {
                                    player.InjuryStatus = status;
                                    player.InjuryBodyPart = "TBD"; // Team roster non sempre ha dettagli
                                    injuredCount++;
                                }
                            }
                        }
                    }
                }

                // Rate limiting critico!
                await Task.Delay(350);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"⚠️  Errore processing team {teamCode}: {ex.Message}");
            }
        }

        _logger.LogInformation($"✅ Trovati {injuredCount} giocatori infortunati da team rosters");
    }

    public async Task UpdateSeasonStatsAsync() => await SyncPlayersAsync();

    // --- HELPER PRIVATI (PARSING E UTILITY) ---

    // Questo metodo è lungo perché deve mappare decine di colonne statistiche
    private async Task ProcessSeasonAsync(ApplicationDbContext context, string season, bool isCurrentSeason, Dictionary<int, PlayerBio> bioMap)
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

            // --- OTTIMIZZAZIONE BATCH (UPSERT) ---
            var playersToUpsert = new List<Player>();
            // Lista temporanea per le stats: (ExternalId, StatObject)
            var statsToSync = new List<(int ExtId, PlayerSeasonStat Stat)>();

            foreach (var row in rows)
            {
                int externalId = GetInt(row, idxId);
                string fullName = row[idxName].ValueKind == JsonValueKind.String ? row[idxName].GetString() ?? "Unknown" : "Unknown";
                string teamName = (row[idxTeam].ValueKind == JsonValueKind.String) ? row[idxTeam].GetString() ?? "FA" : "FA";
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
                double fpts = Math.Round(pts + (reb * 1.2) + (ast * 1.5) + (stl * 3) + (blk * 3) - tov, 1);
                
                // Advanced & Shooting
                double fgm = GetVal(row, idxFgm); double fga = GetVal(row, idxFga); double fgPct = GetVal(row, idxFgPct);
                double tpm = GetVal(row, idx3pm); double tpa = GetVal(row, idx3pa); double tpPct = GetVal(row, idx3pPct);
                double ftm = GetVal(row, idxFtm); double fta = GetVal(row, idxFta); double ftPct = GetVal(row, idxFtPct);
                double oreb = GetVal(row, idxOreb); double dreb = GetVal(row, idxDreb);
                double pm = GetVal(row, idxPlusMinus); double wpct = GetVal(row, idxWpct);
                double dd = GetVal(row, idxDd2); double td = GetVal(row, idxTd3);
                
                double efficiency = Math.Round((pts + reb + ast + stl + blk) - (fga - fgm) - (fta - ftm) - tov, 1);

                if (isCurrentSeason)
                {
                    var names = fullName.Split(' ');
                    var firstName = names[0].Replace("'", "''"); // Simple SQL escape for later
                    var lastName = (names.Length > 1 ? string.Join(" ", names.Skip(1)) : "").Replace("'", "''");

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

                    playersToUpsert.Add(p);
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

            // 1. UPSERT PLAYERS (Solo Current Season)
            if (isCurrentSeason && playersToUpsert.Any())
            {
                await BulkUpsertPlayersAsync(context, playersToUpsert);
            }

            // 2. RECUPERA MAPPING ID (External -> Internal)
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

    private struct PlayerBio { public string Position; public string Height; public string Weight; }

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

            foreach (var row in rows)
            {
                if (idxId == -1) continue;
                int id = row[idxId].GetInt32();
                bioMap[id] = new PlayerBio
                {
                    Position = idxPos != -1 ? row[idxPos].ToString() : "F",
                    Height = idxH != -1 ? row[idxH].ToString() : "",
                    Weight = idxW != -1 ? row[idxW].ToString() : ""
                };
            }
            
            _cache.Set($"bio_{season}", bioMap, TimeSpan.FromHours(24));
        }
        catch { }
        return bioMap;
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