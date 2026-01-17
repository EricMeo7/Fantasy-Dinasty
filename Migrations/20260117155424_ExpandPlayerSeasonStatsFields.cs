using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class ExpandPlayerSeasonStatsFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DefRebounds",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "DoubleDoubles",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Efficiency",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Fga",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Fgm",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Fta",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Ftm",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "OffRebounds",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PersonalFouls",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PlusMinus",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ThreePa",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ThreePm",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TripleDoubles",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "WinPct",
                table: "PlayerSeasonStats",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefRebounds",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "DoubleDoubles",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "Efficiency",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "Fga",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "Fgm",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "Fta",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "Ftm",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "OffRebounds",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "PersonalFouls",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "PlusMinus",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "ThreePa",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "ThreePm",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "TripleDoubles",
                table: "PlayerSeasonStats");

            migrationBuilder.DropColumn(
                name: "WinPct",
                table: "PlayerSeasonStats");
        }
    }
}
