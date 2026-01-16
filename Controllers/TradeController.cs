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
public class TradeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public TradeController(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    [HttpGet("pending-count")]
    public async Task<IActionResult> GetPendingCount(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Trades.GetMyTrades.GetMyTradesQuery(leagueId, userId);
        var result = await mediator.Send(query);

        if (!result.IsSuccess) return Ok(new { count = 0 });
        
        // Count trades where I'm not the proposer and haven't accepted yet
        int count = result.Value.Count(t => !t.IsMeProposer && !t.DidIAccept);
        return Ok(new { count });
    }

    [HttpPost("propose")]
    public async Task<IActionResult> ProposeTrade(
        [FromBody] TradeProposalDto dto, 
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        
        var command = new Features.Trades.ProposeTrade.ProposeTradeCommand
        {
            LeagueId = leagueId,
            ProposerId = userId,
            Offers = dto.Offers.Select(o => new Features.Trades.ProposeTrade.TradeOfferCommand
            {
                FromUserId = o.FromUserId,
                ToUserId = o.ToUserId,
                PlayerId = o.PlayerId
            }).ToList()
        };

        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = "Offerta di scambio inviata!", tradeId = result.Value });
    }

    [HttpPost("accept/{tradeId}")]
    public async Task<IActionResult> AcceptTrade(
        int tradeId, 
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Trades.AcceptTrade.AcceptTradeCommand(tradeId, leagueId, userId);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    [HttpPost("reject/{tradeId}")]
    public async Task<IActionResult> RejectTrade(
        int tradeId, 
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var command = new Features.Trades.RejectTrade.RejectTradeCommand(tradeId, leagueId, userId);
        
        var result = await mediator.Send(command);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(new { message = result.Value });
    }

    [HttpGet("my-trades")]
    public async Task<IActionResult> GetMyTrades(
        [FromHeader(Name = "X-League-Id")] int leagueId,
        [FromServices] MediatR.IMediator mediator)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var query = new Features.Trades.GetMyTrades.GetMyTradesQuery(leagueId, userId);
        
        var result = await mediator.Send(query);
        if (!result.IsSuccess) return BadRequest(result.Error);

        return Ok(result.Value);
    }
}