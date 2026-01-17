using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDetailedRosterSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop columns
            migrationBuilder.DropColumn(
                name: "RosterSlotsBench",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsC",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsF",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsG",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsIR",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsPF",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsPG",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsSF",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsSG",
                table: "LeagueSettings");

            migrationBuilder.DropColumn(
                name: "RosterSlotsUtil",
                table: "LeagueSettings");

            // Enforce Defaults for Role Limits
            // Using quotes for PostgreSQL case sensitivity
            migrationBuilder.Sql("UPDATE \"LeagueSettings\" SET \"RoleLimitGuards\" = 5, \"RoleLimitForwards\" = 5, \"RoleLimitCenters\" = 3");
            // Also checking if the table name matches schema.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsBench",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsC",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsF",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsG",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsIR",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsPF",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsPG",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsSF",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsSG",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RosterSlotsUtil",
                table: "LeagueSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
