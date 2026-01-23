using System;

namespace FantasyBasket.API.Common;

public static class SeasonHelper
{
    /// <summary>
    /// Parses a season string (e.g., "2025-26" or "2025") into the starting year integer (2025).
    /// </summary>
    public static int ParseStartYear(string? season)
    {
        if (string.IsNullOrEmpty(season)) return DateTime.UtcNow.Year;
        
        // Handle "2025-26"
        var parts = season.Split('-');
        if (parts.Length > 0 && int.TryParse(parts[0], out int year))
        {
            return year;
        }
        
        return DateTime.UtcNow.Year;
    }
}
