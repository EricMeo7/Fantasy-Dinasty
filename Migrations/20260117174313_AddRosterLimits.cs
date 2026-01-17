using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRosterLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RoleLimitCenters",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RoleLimitForwards",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RoleLimitGuards",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RoleLimitCenters",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RoleLimitForwards",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RoleLimitGuards",
                table: "LeagueSettings");
        }
    }
}
