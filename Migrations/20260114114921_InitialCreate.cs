using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    GeneralManagerName = table.Column<string>(type: "text", nullable: true),
                    FantasyTeamName = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalCareerFantasyPoints = table.Column<double>(type: "double precision", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DeadCaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TeamId = table.Column<string>(type: "text", nullable: false),
                    Season = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<double>(type: "double precision", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeadCaps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Leagues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    InvitationCode = table.Column<string>(type: "text", nullable: false),
                    SalaryCap = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CurrentSeason = table.Column<string>(type: "text", nullable: false),
                    SeasonStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MinBidAmount = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leagues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NbaGames",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NbaGameId = table.Column<string>(type: "text", nullable: false),
                    GameDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    GameTime = table.Column<string>(type: "text", nullable: false),
                    HomeTeam = table.Column<string>(type: "text", nullable: false),
                    AwayTeam = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NbaGames", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerGameLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    GameDate = table.Column<string>(type: "text", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Rebounds = table.Column<int>(type: "integer", nullable: false),
                    Assists = table.Column<int>(type: "integer", nullable: false),
                    Steals = table.Column<int>(type: "integer", nullable: false),
                    Blocks = table.Column<int>(type: "integer", nullable: false),
                    Turnovers = table.Column<int>(type: "integer", nullable: false),
                    Minutes = table.Column<double>(type: "double precision", nullable: false),
                    FantasyPoints = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerGameLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<int>(type: "integer", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    Position = table.Column<string>(type: "text", nullable: false),
                    NbaTeam = table.Column<string>(type: "text", nullable: false),
                    Height = table.Column<string>(type: "text", nullable: false),
                    Weight = table.Column<string>(type: "text", nullable: false),
                    AvgPoints = table.Column<double>(type: "double precision", nullable: false),
                    AvgRebounds = table.Column<double>(type: "double precision", nullable: false),
                    AvgAssists = table.Column<double>(type: "double precision", nullable: false),
                    AvgSteals = table.Column<double>(type: "double precision", nullable: false),
                    AvgBlocks = table.Column<double>(type: "double precision", nullable: false),
                    Fgm = table.Column<double>(type: "double precision", nullable: false),
                    Fga = table.Column<double>(type: "double precision", nullable: false),
                    FgPercent = table.Column<double>(type: "double precision", nullable: false),
                    ThreePm = table.Column<double>(type: "double precision", nullable: false),
                    ThreePa = table.Column<double>(type: "double precision", nullable: false),
                    ThreePtPercent = table.Column<double>(type: "double precision", nullable: false),
                    Ftm = table.Column<double>(type: "double precision", nullable: false),
                    Fta = table.Column<double>(type: "double precision", nullable: false),
                    FtPercent = table.Column<double>(type: "double precision", nullable: false),
                    OffRebounds = table.Column<double>(type: "double precision", nullable: false),
                    DefRebounds = table.Column<double>(type: "double precision", nullable: false),
                    AvgMinutes = table.Column<double>(type: "double precision", nullable: false),
                    AvgTurnovers = table.Column<double>(type: "double precision", nullable: false),
                    PersonalFouls = table.Column<double>(type: "double precision", nullable: false),
                    PlusMinus = table.Column<double>(type: "double precision", nullable: false),
                    Efficiency = table.Column<double>(type: "double precision", nullable: false),
                    WinPct = table.Column<double>(type: "double precision", nullable: false),
                    DoubleDoubles = table.Column<double>(type: "double precision", nullable: false),
                    TripleDoubles = table.Column<double>(type: "double precision", nullable: false),
                    FantasyPoints = table.Column<double>(type: "double precision", nullable: false),
                    GamesPlayed = table.Column<int>(type: "integer", nullable: false),
                    InjuryStatus = table.Column<string>(type: "text", nullable: true),
                    InjuryBodyPart = table.Column<string>(type: "text", nullable: true),
                    InjuryReturnDate = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Trades",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    ProposerId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trades", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RoleId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Matchups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    WeekNumber = table.Column<int>(type: "integer", nullable: false),
                    HomeTeamId = table.Column<string>(type: "text", nullable: true),
                    HomeTeamPlaceholder = table.Column<string>(type: "text", nullable: true),
                    AwayTeamId = table.Column<string>(type: "text", nullable: true),
                    AwayTeamPlaceholder = table.Column<string>(type: "text", nullable: true),
                    HomeScore = table.Column<double>(type: "double precision", nullable: false),
                    AwayScore = table.Column<double>(type: "double precision", nullable: false),
                    IsPlayed = table.Column<bool>(type: "boolean", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matchups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Matchups_AspNetUsers_AwayTeamId",
                        column: x => x.AwayTeamId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Matchups_AspNetUsers_HomeTeamId",
                        column: x => x.HomeTeamId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LeagueSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    CurrentSeason = table.Column<string>(type: "text", nullable: false),
                    PlayoffTeams = table.Column<int>(type: "integer", nullable: false),
                    SalaryCap = table.Column<double>(type: "double precision", nullable: false),
                    SalaryFloor = table.Column<double>(type: "double precision", nullable: false),
                    MinBidAmount = table.Column<double>(type: "double precision", nullable: false),
                    PointWeight = table.Column<double>(type: "double precision", nullable: false),
                    ReboundWeight = table.Column<double>(type: "double precision", nullable: false),
                    AssistWeight = table.Column<double>(type: "double precision", nullable: false),
                    StealWeight = table.Column<double>(type: "double precision", nullable: false),
                    BlockWeight = table.Column<double>(type: "double precision", nullable: false),
                    TurnoverWeight = table.Column<double>(type: "double precision", nullable: false),
                    RosterSlotsPG = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsSG = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsSF = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsPF = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsC = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsG = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsF = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsUtil = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsBench = table.Column<int>(type: "integer", nullable: false),
                    RosterSlotsIR = table.Column<int>(type: "integer", nullable: false),
                    SeasonStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SeasonEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeagueSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeagueSettings_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Teams",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    IsAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Division = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Teams", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Teams_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Teams_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Auctions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    HighBidderId = table.Column<string>(type: "text", nullable: true),
                    CurrentOfferTotal = table.Column<double>(type: "double precision", nullable: false),
                    CurrentOfferYears = table.Column<int>(type: "integer", nullable: false),
                    CurrentYear1Amount = table.Column<double>(type: "double precision", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Auctions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Auctions_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlayerSeasonStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<string>(type: "text", nullable: false),
                    NbaTeam = table.Column<string>(type: "text", nullable: false),
                    AvgPoints = table.Column<double>(type: "double precision", nullable: false),
                    AvgRebounds = table.Column<double>(type: "double precision", nullable: false),
                    AvgAssists = table.Column<double>(type: "double precision", nullable: false),
                    AvgSteals = table.Column<double>(type: "double precision", nullable: false),
                    AvgBlocks = table.Column<double>(type: "double precision", nullable: false),
                    GamesPlayed = table.Column<int>(type: "integer", nullable: false),
                    AvgMinutes = table.Column<double>(type: "double precision", nullable: false),
                    FgPercent = table.Column<double>(type: "double precision", nullable: false),
                    ThreePtPercent = table.Column<double>(type: "double precision", nullable: false),
                    FtPercent = table.Column<double>(type: "double precision", nullable: false),
                    AvgTurnovers = table.Column<double>(type: "double precision", nullable: false),
                    FantasyPoints = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerSeasonStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerSeasonStats_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TradeAcceptances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TradeId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeAcceptances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradeAcceptances_Trades_TradeId",
                        column: x => x.TradeId,
                        principalTable: "Trades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TradeOffers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TradeId = table.Column<int>(type: "integer", nullable: false),
                    FromUserId = table.Column<string>(type: "text", nullable: false),
                    ToUserId = table.Column<string>(type: "text", nullable: false),
                    PlayerId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeOffers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradeOffers_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TradeOffers_Trades_TradeId",
                        column: x => x.TradeId,
                        principalTable: "Trades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Contracts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TeamId = table.Column<int>(type: "integer", nullable: false),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    SalaryYear1 = table.Column<double>(type: "double precision", nullable: false),
                    SalaryYear2 = table.Column<double>(type: "double precision", nullable: false),
                    SalaryYear3 = table.Column<double>(type: "double precision", nullable: false),
                    ContractYears = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contracts_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Contracts_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DailyLineups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    TeamId = table.Column<int>(type: "integer", nullable: false),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsStarter = table.Column<bool>(type: "boolean", nullable: false),
                    Slot = table.Column<string>(type: "text", nullable: false),
                    BenchOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyLineups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyLineups_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyLineups_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Bids",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AuctionId = table.Column<int>(type: "integer", nullable: false),
                    BidderId = table.Column<string>(type: "text", nullable: false),
                    TotalAmount = table.Column<double>(type: "double precision", nullable: false),
                    Years = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bids", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bids_Auctions_AuctionId",
                        column: x => x.AuctionId,
                        principalTable: "Auctions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Auctions_LeagueId_IsActive",
                table: "Auctions",
                columns: new[] { "LeagueId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Auctions_PlayerId",
                table: "Auctions",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Bids_AuctionId",
                table: "Bids",
                column: "AuctionId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_PlayerId",
                table: "Contracts",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Contracts_TeamId",
                table: "Contracts",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyLineups_PlayerId",
                table: "DailyLineups",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyLineups_TeamId_Date",
                table: "DailyLineups",
                columns: new[] { "TeamId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Leagues_InvitationCode",
                table: "Leagues",
                column: "InvitationCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeagueSettings_LeagueId",
                table: "LeagueSettings",
                column: "LeagueId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Matchups_AwayTeamId",
                table: "Matchups",
                column: "AwayTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Matchups_HomeTeamId",
                table: "Matchups",
                column: "HomeTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Matchups_LeagueId_IsPlayed_WeekNumber",
                table: "Matchups",
                columns: new[] { "LeagueId", "IsPlayed", "WeekNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerGameLogs_GameDate_PlayerId",
                table: "PlayerGameLogs",
                columns: new[] { "GameDate", "PlayerId" });

            migrationBuilder.CreateIndex(
                name: "IX_Players_AvgPoints",
                table: "Players",
                column: "AvgPoints");

            migrationBuilder.CreateIndex(
                name: "IX_Players_ExternalId",
                table: "Players",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_PlayerId",
                table: "PlayerSeasonStats",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Teams_LeagueId",
                table: "Teams",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_Teams_UserId_LeagueId",
                table: "Teams",
                columns: new[] { "UserId", "LeagueId" });

            migrationBuilder.CreateIndex(
                name: "IX_TradeAcceptances_TradeId",
                table: "TradeAcceptances",
                column: "TradeId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeOffers_FromUserId",
                table: "TradeOffers",
                column: "FromUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeOffers_PlayerId",
                table: "TradeOffers",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeOffers_ToUserId",
                table: "TradeOffers",
                column: "ToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeOffers_TradeId",
                table: "TradeOffers",
                column: "TradeId");

            migrationBuilder.CreateIndex(
                name: "IX_Trades_LeagueId_Status",
                table: "Trades",
                columns: new[] { "LeagueId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "Bids");

            migrationBuilder.DropTable(
                name: "Contracts");

            migrationBuilder.DropTable(
                name: "DailyLineups");

            migrationBuilder.DropTable(
                name: "DeadCaps");

            migrationBuilder.DropTable(
                name: "LeagueSettings");

            migrationBuilder.DropTable(
                name: "Matchups");

            migrationBuilder.DropTable(
                name: "NbaGames");

            migrationBuilder.DropTable(
                name: "PlayerGameLogs");

            migrationBuilder.DropTable(
                name: "PlayerSeasonStats");

            migrationBuilder.DropTable(
                name: "TradeAcceptances");

            migrationBuilder.DropTable(
                name: "TradeOffers");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Auctions");

            migrationBuilder.DropTable(
                name: "Teams");

            migrationBuilder.DropTable(
                name: "Trades");

            migrationBuilder.DropTable(
                name: "Players");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Leagues");
        }
    }
}
