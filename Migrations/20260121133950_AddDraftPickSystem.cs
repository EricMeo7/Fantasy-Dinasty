using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDraftPickSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NumberOfTeams",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsRookieContract",
                table: "Contracts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsYear3TeamOption",
                table: "Contracts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OptionDeadline",
                table: "Contracts",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OptionExercised",
                table: "Contracts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "DraftPicks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Round = table.Column<int>(type: "integer", nullable: false),
                    OriginalOwnerTeamId = table.Column<int>(type: "integer", nullable: false),
                    CurrentOwnerTeamId = table.Column<int>(type: "integer", nullable: false),
                    SlotNumber = table.Column<int>(type: "integer", nullable: true),
                    PlayerId = table.Column<int>(type: "integer", nullable: true),
                    LeagueId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DraftPicks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DraftPicks_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DraftPicks_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DraftPicks_Teams_CurrentOwnerTeamId",
                        column: x => x.CurrentOwnerTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DraftPicks_Teams_OriginalOwnerTeamId",
                        column: x => x.OriginalOwnerTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TradePickOffers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TradeId = table.Column<int>(type: "integer", nullable: false),
                    FromUserId = table.Column<string>(type: "text", nullable: false),
                    ToUserId = table.Column<string>(type: "text", nullable: false),
                    DraftPickId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradePickOffers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradePickOffers_DraftPicks_DraftPickId",
                        column: x => x.DraftPickId,
                        principalTable: "DraftPicks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TradePickOffers_Trades_TradeId",
                        column: x => x.TradeId,
                        principalTable: "Trades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DraftPicks_CurrentOwnerTeamId",
                table: "DraftPicks",
                column: "CurrentOwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_DraftPicks_LeagueId_Season_Round",
                table: "DraftPicks",
                columns: new[] { "LeagueId", "Season", "Round" });

            migrationBuilder.CreateIndex(
                name: "IX_DraftPicks_OriginalOwnerTeamId",
                table: "DraftPicks",
                column: "OriginalOwnerTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_DraftPicks_PlayerId",
                table: "DraftPicks",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_TradePickOffers_DraftPickId",
                table: "TradePickOffers",
                column: "DraftPickId");

            migrationBuilder.CreateIndex(
                name: "IX_TradePickOffers_TradeId",
                table: "TradePickOffers",
                column: "TradeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TradePickOffers");

            migrationBuilder.DropTable(
                name: "DraftPicks");

            migrationBuilder.DropColumn(
                name: "NumberOfTeams",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "IsRookieContract",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "IsYear3TeamOption",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "OptionDeadline",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "OptionExercised",
                table: "Contracts");
        }
    }
}
