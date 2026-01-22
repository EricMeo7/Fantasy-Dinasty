using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLotteryReveal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRevealed",
                table: "DraftPicks",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRevealed",
                table: "DraftPicks");
        }
    }
}
