using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.UpdateScores;

public class UpdateScoresHandler : IRequestHandler<UpdateScoresCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;
    private readonly MatchupService _matchupService;

    public UpdateScoresHandler(ApplicationDbContext context, MatchupService matchupService)
    {
        _context = context;
        _matchupService = matchupService;
    }

    public async Task<Result<string>> Handle(UpdateScoresCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var isAdmin = await _context.Teams
            .AnyAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId && t.IsAdmin, cancellationToken);
        if (!isAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Update Scores
        await _matchupService.UpdateLiveScores(request.LeagueId);

        return Result<string>.Success(SuccessCodes.SCORES_UPDATED);
    }
}
