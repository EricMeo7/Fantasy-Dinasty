using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Draft.GetDraftAssets;

public class GetDraftAssetsHandler : IRequestHandler<GetDraftAssetsQuery, List<DraftAssetDto>>
{
    private readonly ApplicationDbContext _context;

    public GetDraftAssetsHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DraftAssetDto>> Handle(GetDraftAssetsQuery request, CancellationToken cancellationToken)
    {
        var teamId = request.TeamId;

        var draftAssets = await _context.DraftPicks
            .AsNoTracking()
            .Where(dp => dp.CurrentOwnerTeamId == teamId)
            .Include(dp => dp.OriginalOwner)
            .Include(dp => dp.CurrentOwner)
            .Include(dp => dp.Player)
            .OrderBy(dp => dp.Season)
            .ThenBy(dp => dp.Round)
            .ThenBy(dp => dp.SlotNumber ?? 999) // Unassigned slots at end
            .Select(dp => new DraftAssetDto
            {
                Id = dp.Id,
                Season = dp.Season,
                Round = dp.Round,
                SlotNumber = dp.SlotNumber,
                OriginalOwnerTeamId = dp.OriginalOwnerTeamId,
                OriginalOwnerTeamName = dp.OriginalOwner.Name,
                CurrentOwnerTeamId = dp.CurrentOwnerTeamId,
                CurrentOwnerTeamName = dp.CurrentOwner.Name,
                IsOwn = dp.OriginalOwnerTeamId == dp.CurrentOwnerTeamId,
                PlayerId = dp.PlayerId,
                PlayerName = dp.Player != null ? $"{dp.Player.FirstName} {dp.Player.LastName}" : null,
                LeagueId = dp.LeagueId
            })
            .ToListAsync(cancellationToken);

        return draftAssets;
    }
}
