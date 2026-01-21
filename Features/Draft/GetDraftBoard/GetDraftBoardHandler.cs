using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Draft.GetDraftBoard;

public class GetDraftBoardHandler : IRequestHandler<GetDraftBoardQuery, List<DraftBoardSlotDto>>
{
    private readonly ApplicationDbContext _context;

    public GetDraftBoardHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DraftBoardSlotDto>> Handle(GetDraftBoardQuery request, CancellationToken cancellationToken)
    {
        var draftBoard = await _context.DraftPicks
            .AsNoTracking()
            .Where(dp => dp.LeagueId == request.LeagueId && dp.Season == request.Season)
            .Include(dp => dp.OriginalOwner)
            .Include(dp => dp.CurrentOwner)
            .Include(dp => dp.Player)
            .OrderBy(dp => dp.SlotNumber.HasValue ? 0 : 1) // Assigned slots first
            .ThenBy(dp => dp.SlotNumber ?? 999)
            .ThenBy(dp => dp.Round)
            .ThenBy(dp => dp.OriginalOwnerTeamId)
            .Select(dp => new DraftBoardSlotDto
            {
                Id = dp.Id,
                Season = dp.Season,
                Round = dp.Round,
                SlotNumber = dp.SlotNumber,
                OriginalOwnerTeamId = dp.OriginalOwnerTeamId,
                OriginalOwnerTeamName = dp.OriginalOwner.Name,
                CurrentOwnerTeamId = dp.CurrentOwnerTeamId,
                CurrentOwnerTeamName = dp.CurrentOwner.Name,
                IsTradedPick = dp.OriginalOwnerTeamId != dp.CurrentOwnerTeamId,
                PlayerId = dp.PlayerId,
                PlayerName = dp.Player != null ? $"{dp.Player.FirstName} {dp.Player.LastName}" : null,
                IsRevealed = dp.IsRevealed
            })
            .ToListAsync(cancellationToken);

        return draftBoard;
    }
}
