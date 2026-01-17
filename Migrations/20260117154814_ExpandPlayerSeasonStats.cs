using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class ExpandPlayerSeasonStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlayerSeasonStats_PlayerId",
                table: "PlayerSeasonStats");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_PlayerId_Season",
                table: "PlayerSeasonStats",
                columns: new[] { "PlayerId", "Season" });

            migrationBuilder.CreateIndex(
                name: "IX_Players_FirstName",
                table: "Players",
                column: "FirstName");

            migrationBuilder.CreateIndex(
                name: "IX_Players_LastName",
                table: "Players",
                column: "LastName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlayerSeasonStats_PlayerId_Season",
                table: "PlayerSeasonStats");

            migrationBuilder.DropIndex(
                name: "IX_Players_FirstName",
                table: "Players");

            migrationBuilder.DropIndex(
                name: "IX_Players_LastName",
                table: "Players");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_PlayerId",
                table: "PlayerSeasonStats",
                column: "PlayerId");
        }
    }
}
