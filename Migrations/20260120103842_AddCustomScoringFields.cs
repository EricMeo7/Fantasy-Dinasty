using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomScoringFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefRebounds",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Fga",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Fgm",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Fta",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Ftm",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OffRebounds",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ThreePa",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ThreePm",
                table: "PlayerGameLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Won",
                table: "PlayerGameLogs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "DrebWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FgaWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FgmWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FtaWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FtmWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "LossWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "OrebWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ThreePaWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ThreePmWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "WinWeight",
                table: "LeagueSettings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefRebounds",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "Fga",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "Fgm",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "Fta",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "Ftm",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "OffRebounds",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "ThreePa",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "ThreePm",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "Won",
                table: "PlayerGameLogs");

            migrationBuilder.DropColumn(
                name: "DrebWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "FgaWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "FgmWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "FtaWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "FtmWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "LossWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "OrebWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "ThreePaWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "ThreePmWeight",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "WinWeight",
                table: "LeagueSettings");
        }
    }
}
