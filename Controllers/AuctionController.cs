using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using FantasyBasket.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FantasyBasket.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class AuctionController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public AuctionController(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    // POST: api/auction/bid
    [HttpPost("bid")]
    public async Task<IActionResult> PlaceBid(
        [FromBody] BidRequestDto request, 
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var command = new Features.Market.PlaceBid.PlaceBidCommand
        {
            PlayerId = request.PlayerId,
            TotalAmount = request.TotalAmount,
            Years = request.Years,
            LeagueId = leagueId,
            UserId = userId
        };

        var result = await mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }

        return Ok(new
        {
            message = result.Value.Message,
            end_time = result.Value.EndTime,
            year1_cost = result.Value.Year1Cost
        });
    }
}