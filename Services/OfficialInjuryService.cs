using System.Text;
using System.Globalization;
using FantasyBasket.API.Data;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using FantasyBasket.API.Models;

namespace FantasyBasket.API.Services
{
    public class OfficialInjuryService
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<OfficialInjuryService> _logger;

        private const string CBS_INJURY_PAGE_URL = "https://www.cbssports.com/nba/injuries/";

        public OfficialInjuryService(IHttpClientFactory clientFactory, ApplicationDbContext context, ILogger<OfficialInjuryService> logger)
        {
            _clientFactory = clientFactory;
            _context = context;
            _logger = logger;
        }

        public async Task<List<string>> UpdateInjuriesFromOfficialReportAsync(bool deepScan = false)
        {
            var logs = new List<string>();
            try
            {
                logs.Add($"Starting Injury Update from CBS Sports...");

                var client = _clientFactory.CreateClient("CbsSports");

                var html = await client.GetStringAsync(CBS_INJURY_PAGE_URL);
                var doc = new HtmlDocument();
                doc.LoadHtml(html);

                var scrapedInjuries = ParseCbsHtml(doc, logs);

                if (!scrapedInjuries.Any())
                {
                    logs.Add("WARNING: No injury data scraped. HTML structure might have changed.");
                    return logs;
                }

                logs.Add($"Scraped {scrapedInjuries.Count} injury records.");
                await UpdateDatabaseAsync(scrapedInjuries, logs);

                logs.Add("Injury Update completed successfully.");
                return logs;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating injuries from CBS.");
                logs.Add($"ERROR: {ex.Message}");
                return logs;
            }
        }

        private List<ScrapedInjury> ParseCbsHtml(HtmlDocument doc, List<string> logs)
        {
            var results = new List<ScrapedInjury>();

            // The table rows usually have class "TableBase-bodyTr"
            var rows = doc.DocumentNode.SelectNodes("//tr[contains(@class, 'TableBase-bodyTr')]");

            if (rows == null)
            {
                logs.Add("Debug: No rows found with class 'TableBase-bodyTr'. Trying generic table rows.");
                rows = doc.DocumentNode.SelectNodes("//table//tr"); 
            }

            if (rows == null) return results;

            foreach (var row in rows)
            {
                try
                {
                    var cells = row.SelectNodes("td");
                    if (cells == null || cells.Count < 5) continue; 
                    // Expected columns: Player, Position, Date, Injury, Status

                    // 0. Player Name (often inside a span or a link)
                    var playerCell = cells[0];
                    var nameNode = playerCell.SelectSingleNode(".//span[@class='CellPlayerName--long']") 
                                   ?? playerCell.SelectSingleNode(".//a");
                    
                    var rawName = nameNode?.InnerText?.Trim() ?? playerCell.InnerText.Trim();
                    
                    // 1. Position
                    var position = cells[1].InnerText.Trim();

                    // 2. Date
                    var date = cells[2].InnerText.Trim();

                    // 3. Injury Type
                    var injuryType = cells[3].InnerText.Trim();

                    // 4. Status / Return Expected
                    var statusFullText = cells[4].InnerText.Trim();

                    if (!string.IsNullOrWhiteSpace(rawName))
                    {
                        results.Add(new ScrapedInjury
                        {
                            PlayerName = CleanName(rawName),
                            Position = position,
                            InjuryType = injuryType,
                            StatusNote = statusFullText,
                            Date = date
                        });
                    }
                }
                catch
                {
                    // Skip bad rows but don't crash
                    continue; 
                }
            }

            return results;
        }

        private async Task UpdateDatabaseAsync(List<ScrapedInjury> scrapedData, List<string> logs)
        {
            // Optimize: Fetch only required fields for matching in memory
            var allPlayersData = await _context.Players
                .AsNoTracking()
                .Select(p => new { p.Id, p.FirstName, p.LastName })
                .ToListAsync();

            int updatedCount = 0;
            int notFoundCount = 0;

            foreach (var scraped in scrapedData)
            {
                var matchedPlayer = FindPlayerOptimized(allPlayersData, scraped.PlayerName);

                if (matchedPlayer != null)
                {
                    // Find the tracked entity to update
                    var player = await _context.Players.FindAsync(matchedPlayer.Id);
                    if (player != null)
                    {
                        var shortStatus = DetermineShortStatus(scraped.StatusNote);
                        player.InjuryStatus = shortStatus;
                        player.InjuryBodyPart = scraped.InjuryType;
                        player.InjuryReturnDate = scraped.StatusNote;
                        updatedCount++;
                    }
                }
                else
                {
                    notFoundCount++;
                    if (notFoundCount <= 5) logs.Add($"MISSING MATCH: {scraped.PlayerName}");
                }
            }

            await _context.SaveChangesAsync();
            logs.Add($"Database Updated: {updatedCount} players matched. {notFoundCount} unmatched.");
        }

        private dynamic? FindPlayerOptimized(IEnumerable<dynamic> dbPlayers, string scrapedName)
        {
            var normalizedScraped = RemoveDiacritics(scrapedName).ToLower()
                .Replace(" ", "").Replace(".", "").Replace("'", "").Replace("-", "");

            return dbPlayers.FirstOrDefault(p => 
            {
                var full = RemoveDiacritics(p.FirstName + p.LastName).ToLower();
                var dbFull = full.Replace(" ", "").Replace(".", "").Replace("'", "").Replace("-", "");
                
                var reverse = RemoveDiacritics(p.LastName + p.FirstName).ToLower();
                var dbReverse = reverse.Replace(" ", "").Replace(".", "").Replace("'", "").Replace("-", "");
                
                return dbFull == normalizedScraped || dbReverse == normalizedScraped;
            });
        }

        private string CleanName(string raw)
        {
            // Remove suffixes if needed, trim spaces
            // CBS often formats names nicely, but sometimes has "III" stuck.
            // Just basic trim for now.
            return raw.Replace("&nbsp;", " ").Trim();
        }

        private string DetermineShortStatus(string fullNote)
        {
            var lower = fullNote.ToLower();
            if (lower.Contains("out") || lower.Contains("surgery") || lower.Contains("week")) return "Out";
            if (lower.Contains("questionable")) return "Questionable";
            if (lower.Contains("doubtful")) return "Doubtful";
            if (lower.Contains("probable")) return "Probable";
            if (lower.Contains("game time") || lower.Contains("decision")) return "GTD"; // Game Time Decision
            
            return "Out"; // Default strict fallback if listed on injury page
        }

        private string RemoveDiacritics(string text) 
        {
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }

        private class ScrapedInjury
        {
            public string PlayerName { get; set; } = "";
            public string Position { get; set; } = "";
            public string Date { get; set; } = "";
            public string InjuryType { get; set; } = "";
            public string StatusNote { get; set; } = "";
        }
    }
}
