using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.League.JoinLeague;

public class JoinLeagueHandler : IRequestHandler<JoinLeagueCommand, Result<JoinLeagueResponse>>
{
    private readonly ApplicationDbContext _context;

    public JoinLeagueHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<JoinLeagueResponse>> Handle(JoinLeagueCommand request, CancellationToken cancellationToken)
    {
        var league = await _context.Leagues
            .OrderBy(l => l.Id)
            .FirstOrDefaultAsync(l => l.InvitationCode == request.Code, cancellationToken);
        
        if (league == null) 
            return Result<JoinLeagueResponse>.Failure(ErrorCodes.INVALID_LEAGUE_CODE);

        var exists = await _context.Teams
            .AnyAsync(t => t.LeagueId == league.Id && t.UserId == request.UserId, cancellationToken);
        
        if (exists) 
            return Result<JoinLeagueResponse>.Failure(ErrorCodes.ALREADY_IN_LEAGUE);

        var team = new Models.Team
        {
            Name = request.MyTeamName,
            UserId = request.UserId,
            LeagueId = league.Id,
            IsAdmin = false
        };
        _context.Teams.Add(team);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<JoinLeagueResponse>.Success(new JoinLeagueResponse
        {
            LeagueId = league.Id,
            Message = "Benvenuto nella lega!"
        });
    }
}
