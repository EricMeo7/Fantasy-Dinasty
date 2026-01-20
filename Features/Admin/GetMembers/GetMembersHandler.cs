using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.GetMembers;

public class GetMembersHandler : IRequestHandler<GetMembersQuery, Result<List<LeagueMemberDto>>>
{
    private readonly ApplicationDbContext _context;

    public GetMembersHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<LeagueMemberDto>>> Handle(GetMembersQuery request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (team == null || !team.IsAdmin) return Result<List<LeagueMemberDto>>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Fetch Members
        var members = await _context.Teams
            .AsNoTracking()
            .Where(t => t.LeagueId == request.LeagueId)
            .Select(t => new LeagueMemberDto
            {
                UserId = t.UserId,
                TeamName = t.Name,
                OwnerName = t.User.GeneralManagerName ?? t.User.UserName
            })
            .ToListAsync(cancellationToken);

        return Result<List<LeagueMemberDto>>.Success(members);
    }
}
