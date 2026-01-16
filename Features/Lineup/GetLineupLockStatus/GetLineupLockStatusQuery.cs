using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Lineup.GetLineupLockStatus;

public record GetLineupLockStatusQuery(int LeagueId, DateTime Date) : IRequest<Result<LineupLockStatusDto>>;

public class LineupLockStatusDto
{
    public bool IsLocked { get; set; }
    public DateTime? LockTime { get; set; } // First Game Time
    public string Message { get; set; } = string.Empty;
}

public class GetLineupLockStatusHandler : IRequestHandler<GetLineupLockStatusQuery, Result<LineupLockStatusDto>>
{
    private readonly ApplicationDbContext _context;

    public GetLineupLockStatusHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<LineupLockStatusDto>> Handle(GetLineupLockStatusQuery request, CancellationToken cancellationToken)
    {
        DateTime dayStart = request.Date.Date;
        DateTime dayEnd = dayStart.AddDays(1);

        // Fetch ALL Games of the Day to find the earliest one
        var games = await _context.NbaGames
            .Where(g => g.GameDate >= dayStart && g.GameDate < dayEnd)
            .ToListAsync(cancellationToken);

        if (!games.Any())
        {
            return Result<LineupLockStatusDto>.Success(new LineupLockStatusDto
            {
                IsLocked = false,
                LockTime = null,
                Message = "No Games"
            });
        }

        // Calculate UTC Start Time for each game and find the earliest
        var earliestGameTime = games
            .Select(g => Services.NbaDataService.ParseEstToUtc(g.GameTime, g.GameDate))
            .OrderBy(t => t)
            .First();

        bool isLocked = DateTime.UtcNow > earliestGameTime;

        return Result<LineupLockStatusDto>.Success(new LineupLockStatusDto
        {
            IsLocked = isLocked,
            LockTime = earliestGameTime,
            Message = isLocked ? "Lineup Locked" : "Open"
        });
    }
}
