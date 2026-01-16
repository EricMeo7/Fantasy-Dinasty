using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class MarketController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MarketController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("free-agents")]
    public async Task<IActionResult> GetFreeAgents([FromHeader(Name = "X-League-Id")] int leagueId, [FromServices] MediatR.IMediator mediator)
    {
        var query = new Features.Market.GetFreeAgents.GetFreeAgentsQuery(leagueId);
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpGet("active-auctions")]
    public async Task<IActionResult> GetActiveAuctions([FromHeader(Name = "X-League-Id")] int leagueId, [FromServices] MediatR.IMediator mediator)
    {
        var query = new Features.Market.GetActiveAuctions.GetActiveAuctionsQuery(leagueId);
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return BadRequest(result.Error);
        return Ok(result.Value);
    }

    [HttpGet("player/{id}")]
    public async Task<IActionResult> GetPlayerDetails(int id, [FromHeader(Name = "X-League-Id")] int? leagueId, [FromServices] MediatR.IMediator mediator)
    {
        var query = new Features.Market.GetPlayerDetails.GetPlayerDetailsQuery(id, leagueId);
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return NotFound(result.Error);
        return Ok(result.Value);
    }
}