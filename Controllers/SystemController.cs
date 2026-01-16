using FantasyBasket.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FantasyBasket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SystemController : ControllerBase
{
    private readonly INbaDataService _nbaService;

    public SystemController(INbaDataService nbaService)
    {
        _nbaService = nbaService;
    }

    // Questo popola il DB da zero o aggiorna tutto
    [HttpPost("sync-full")]
    public async Task<IActionResult> SyncFull()
    {
        try
        {
            int count = await _nbaService.SyncPlayersAsync();
            return Ok(new { message = $"Database aggiornato con successo. Processati {count} giocatori." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

}