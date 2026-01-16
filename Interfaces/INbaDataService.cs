namespace FantasyBasket.API.Interfaces;

public interface INbaDataService
{
    // Scarica i giocatori dall'API esterna e li salva nel DB locale
    Task<int> SyncPlayersAsync();
    Task<Dictionary<int, double>> GetFantasyPointsByDate(DateTime date, List<int> externalPlayerIds);
    Task UpdateSeasonStatsAsync();
    Task UpdateDailyNbaSchedule(DateTime date);
    Task ImportSeasonScheduleAsync();
    Task UpdateDailyInjuriesAsync(DateTime date);
    string GetCurrentSeason(); // E.g. "2025-26"
    string GetPreviousSeason(); // E.g. "2024-25"
}