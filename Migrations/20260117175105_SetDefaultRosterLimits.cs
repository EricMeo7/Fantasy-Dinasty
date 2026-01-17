using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyBasket.API.Migrations
{
    /// <inheritdoc />
    public partial class SetDefaultRosterLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"LeagueSettings\" SET \"RoleLimitGuards\" = 5, \"RoleLimitForwards\" = 5, \"RoleLimitCenters\" = 3 WHERE \"RoleLimitGuards\" = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
