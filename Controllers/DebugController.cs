using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace FantasyBasket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DebugController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DebugController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("locks")]
    public async Task<IActionResult> GetLocks()
    {
        try
        {
            // Query dynamic management views (requires permissions, usually OK in dev)
            var sql = @"
                SELECT 
                    r.session_id,
                    r.status,
                    r.blocking_session_id,
                    r.wait_type,
                    r.wait_time,
                    r.wait_resource,
                    r.total_elapsed_time,
                    t.text AS QueryText
                FROM sys.dm_exec_requests r
                CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
                WHERE r.session_id > 50 AND r.session_id <> @@SPID";

            var result = new List<object>();
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = sql;
            using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                result.Add(new
                {
                    SessionId = reader["session_id"],
                    Status = reader["status"],
                    BlockedBy = reader["blocking_session_id"],
                    WaitType = reader["wait_type"],
                    WaitTime = reader["wait_time"],
                    WaitResource = reader["wait_resource"],
                    Elapsed = reader["total_elapsed_time"],
                    Query = reader["QueryText"]
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpGet("test-free-agents-speed/{leagueId}")]
    public async Task<IActionResult> TestFreeAgentsSpeed(int leagueId)
    {
        var logs = new List<string>();
        var sw = Stopwatch.StartNew();

        try 
        {
            var db = _context.Database;
            var connection = db.GetDbConnection();
            
            sw.Restart();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();
            logs.Add($"Connection Open: {sw.ElapsedMilliseconds}ms");

            sw.Restart();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM Players WITH (NOLOCK)";
            var count = await command.ExecuteScalarAsync();
            logs.Add($"Simple Count Query (NOLOCK): {sw.ElapsedMilliseconds}ms (Count: {count})");

            sw.Restart();
            // The BIG query
            command.CommandText = @"
                SELECT p.Id
                FROM Players p WITH (NOLOCK)
                LEFT JOIN Auctions a WITH (NOLOCK) ON p.Id = a.PlayerId AND a.LeagueId = @LeagueId AND a.IsActive = 1
                WHERE p.Id NOT IN (
                    SELECT c.PlayerId 
                    FROM Contracts c WITH (NOLOCK)
                    INNER JOIN Teams tm WITH (NOLOCK) ON c.TeamId = tm.Id
                    WHERE tm.LeagueId = @LeagueId
                )
                ORDER BY p.AvgPoints DESC";
            
            var param = command.CreateParameter();
            param.ParameterName = "@LeagueId";
            param.Value = leagueId;
            command.Parameters.Add(param);

            using var reader = await command.ExecuteReaderAsync();
            logs.Add($"ExecuteReaderAsync: {sw.ElapsedMilliseconds}ms");

            sw.Restart();
            int rows = 0;
            while (await reader.ReadAsync()) rows++;
            logs.Add($"Read All Rows Loop: {sw.ElapsedMilliseconds}ms (Rows: {rows})");

            return Ok(logs);
        }
        catch(Exception ex)
        {
             return BadRequest(new { Error = ex.Message, Logs = logs });
        }
    }
}
