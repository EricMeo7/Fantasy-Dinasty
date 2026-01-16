using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.League.CreateLeague;

public class CreateLeagueHandler : IRequestHandler<CreateLeagueCommand, Result<CreateLeagueResponse>>
{
    private readonly ApplicationDbContext _context;

    public CreateLeagueHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CreateLeagueResponse>> Handle(CreateLeagueCommand request, CancellationToken cancellationToken)
    {
        // 1. Create League
        var league = new Models.League
        {
            Name = request.LeagueName,
            SalaryCap = 200.0,
            Status = LeagueState.DraftMode
        };
        _context.Leagues.Add(league);
        
        // Use a transaction if we want to be safe, but EF handles basic relational save well.
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Create Admin Team
        var team = new Models.Team
        {
            Name = request.MyTeamName,
            UserId = request.UserId,
            LeagueId = league.Id,
            IsAdmin = true
        };
        _context.Teams.Add(team);

        // 3. Optional: Initialize default settings immediately
        var settings = new LeagueSettings { LeagueId = league.Id };
        _context.LeagueSettings.Add(settings);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<CreateLeagueResponse>.Success(new CreateLeagueResponse
        {
            LeagueId = league.Id,
            Code = league.InvitationCode,
            Message = "Lega creata con successo!"
        });
    }
}
