namespace FantasyBasket.API.Common;

public static class ErrorCodes
{
    // Common
    public const string NOT_AUTHORIZED = "ERROR_NOT_AUTHORIZED";
    public const string FORBIDDEN = "ERROR_FORBIDDEN";
    public const string NOT_FOUND = "ERROR_NOT_FOUND";
    public const string USER_NOT_FOUND = "ERROR_USER_NOT_FOUND";
    public const string INTERNAL_ERROR = "ERROR_INTERNAL_ERROR";
    public const string ACCESS_DENIED = "ERROR_ACCESS_DENIED";
    public const string ACCESS_ADMIN_ONLY = "ERROR_ACCESS_ADMIN_ONLY"; // used in ChangeStatusHandler

    // Team
    public const string TEAM_NOT_FOUND = "ERROR_TEAM_NOT_FOUND";
    public const string INSUFFICIENT_BUDGET = "ERROR_INSUFFICIENT_BUDGET";
    public const string ROSTER_FULL = "ERROR_ROSTER_FULL";
    public const string NOT_ENOUGH_TEAMS = "ERROR_NOT_ENOUGH_TEAMS";
    public const string TEAMS_NOT_FOUND = "ERROR_TEAMS_NOT_FOUND";
    public const string NO_TEAM_IN_LEAGUE = "ERROR_NO_TEAM_IN_LEAGUE";
    public const string NOT_IN_LEAGUE = "ERROR_NOT_IN_LEAGUE";
    public const string PLAYER_NOT_IN_ROSTER = "ERROR_PLAYER_NOT_IN_ROSTER";

    // Draft / Auction
    public const string AUCTION_NOT_FOUND = "ERROR_AUCTION_NOT_FOUND";
    public const string AUCTION_IN_PROGRESS = "ERROR_AUCTION_IN_PROGRESS";
    public const string NOT_YOUR_TURN = "ERROR_NOT_YOUR_TURN";
    public const string BID_TOO_LOW = "ERROR_BID_TOO_LOW";
    public const string MIN_BID_NOT_MET = "ERROR_MIN_BID_NOT_MET";
    public const string PLAYER_ALREADY_TAKEN = "ERROR_PLAYER_ALREADY_TAKEN";
    public const string INVALID_BID = "ERROR_INVALID_BID";
    public const string INSUFFICIENT_CAP = "ERROR_INSUFFICIENT_CAP";
    public const string PLAYER_NOT_FOUND = "ERROR_PLAYER_NOT_FOUND";
    public const string LINEUP_LOCKED = "ERROR_LINEUP_LOCKED";
    public const string LINEUP_NOT_FOUND = "ERROR_LINEUP_NOT_FOUND";

    // League
    public const string LEAGUE_NOT_FOUND = "ERROR_LEAGUE_NOT_FOUND";
    public const string LEAGUE_FULL = "ERROR_LEAGUE_FULL";
    public const string INVALID_LEAGUE_CODE = "ERROR_INVALID_LEAGUE_CODE";
    public const string ALREADY_IN_LEAGUE = "ERROR_ALREADY_IN_LEAGUE";
    public const string INVALID_INVITATION_CODE = "ERROR_INVALID_INVITATION_CODE";

    // Trades
    public const string TRADE_INVALID = "ERROR_TRADE_INVALID";
    public const string PROPOSER_CANNOT_ACCEPT = "ERROR_PROPOSER_CANNOT_ACCEPT";
    public const string ALREADY_ACCEPTED = "ERROR_ALREADY_ACCEPTED";
    public const string TRADE_FAILED = "ERROR_TRADE_FAILED";
    public const string TARGET_TEAM_NOT_FOUND = "ERROR_TARGET_TEAM_NOT_FOUND";
    public const string TRADE_NOT_FOUND = "ERROR_TRADE_NOT_FOUND";
    public const string TRADE_NOT_PENDING = "ERROR_TRADE_NOT_PENDING";

    public const string MATCH_NOT_FOUND = "ERROR_MATCH_NOT_FOUND";
    public const string NO_UPCOMING_MATCH = "ERROR_NO_UPCOMING_MATCH";
    
    // File
    public const string NO_FILE_UPLOADED = "ERROR_NO_FILE_UPLOADED";
    public const string FILE_TOO_LARGE = "ERROR_FILE_TOO_LARGE";
}
