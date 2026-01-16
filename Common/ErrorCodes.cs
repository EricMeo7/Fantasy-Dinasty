namespace FantasyBasket.API.Common;

/// <summary>
/// Standardized error codes for API responses.
/// Frontend will translate these codes using i18n.
/// </summary>
public static class ErrorCodes
{
    // Team & League
    public const string TEAM_NOT_FOUND = "TEAM_NOT_FOUND";
    public const string LEAGUE_NOT_FOUND = "LEAGUE_NOT_FOUND";
    public const string NOT_IN_LEAGUE = "NOT_IN_LEAGUE";
    public const string NO_TEAM_IN_LEAGUE = "NO_TEAM_IN_LEAGUE";
    public const string INVALID_LEAGUE_CODE = "INVALID_LEAGUE_CODE";
    public const string ALREADY_IN_LEAGUE = "ALREADY_IN_LEAGUE";
    public const string TEAMS_NOT_FOUND = "TEAMS_NOT_FOUND";
    public const string TARGET_TEAM_NOT_FOUND = "TARGET_TEAM_NOT_FOUND";
    
    // Lineup
    public const string LINEUP_LOCKED = "LINEUP_LOCKED";
    public const string LINEUP_NOT_FOUND = "LINEUP_NOT_FOUND";
    
    // Trade
    public const string TRADE_NOT_FOUND = "TRADE_NOT_FOUND";
    public const string TRADE_NOT_PENDING = "TRADE_NOT_PENDING";
    public const string TRADE_INVALID = "TRADE_INVALID";
    public const string TRADE_FAILED = "TRADE_FAILED";
    public const string ALREADY_ACCEPTED = "ALREADY_ACCEPTED";
    public const string PROPOSER_CANNOT_ACCEPT = "PROPOSER_CANNOT_ACCEPT";
    
    // Player & Market
    public const string PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND";
    public const string PLAYER_NOT_IN_ROSTER = "PLAYER_NOT_IN_ROSTER";
    public const string PLAYER_ALREADY_TAKEN = "PLAYER_ALREADY_TAKEN";
    public const string BID_TOO_LOW = "BID_TOO_LOW";
    public const string INVALID_BID = "INVALID_BID";
    public const string INSUFFICIENT_CAP = "INSUFFICIENT_CAP";
    
    // Match
    public const string MATCH_NOT_FOUND = "MATCH_NOT_FOUND";
    public const string NO_UPCOMING_MATCH = "NO_UPCOMING_MATCH";
    
    // Authorization
    public const string ACCESS_DENIED = "ACCESS_DENIED";
    public const string ACCESS_ADMIN_ONLY = "ACCESS_ADMIN_ONLY";
    public const string NOT_AUTHORIZED = "NOT_AUTHORIZED";
    
    // Generic
    public const string INTERNAL_ERROR = "INTERNAL_ERROR";
}
