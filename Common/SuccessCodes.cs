namespace FantasyBasket.API.Common;

/// <summary>
/// Standardized success message codes for API responses.
/// Frontend will translate these codes using i18n.
/// </summary>
public static class SuccessCodes
{
    public const string PLAYER_RELEASED = "PLAYER_RELEASED";
    public const string TRADE_ACCEPTED = "TRADE_ACCEPTED";
    public const string SCORES_UPDATED = "SCORES_UPDATED";
    public const string SETTINGS_UPDATED = "SETTINGS_UPDATED";
    public const string MARKET_RESET = "MARKET_RESET";
    public const string SCHEDULE_GENERATED = "SCHEDULE_GENERATED";
}
