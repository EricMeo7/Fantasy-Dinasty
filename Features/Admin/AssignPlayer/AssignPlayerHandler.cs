using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.AssignPlayer;

public class AssignPlayerHandler : IRequestHandler<AssignPlayerCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;

    public AssignPlayerHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<string>> Handle(AssignPlayerCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var adminTeam = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (adminTeam == null || !adminTeam.IsAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Validate Target Team
        var targetTeam = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == request.TargetUserId && t.LeagueId == request.LeagueId, cancellationToken);
        if (targetTeam == null) return Result<string>.Failure(ErrorCodes.TARGET_TEAM_NOT_FOUND);

        // 3. Remove Old Contract (Transfer/Correction)
        var existingContract = await _context.Contracts.FirstOrDefaultAsync(c => c.PlayerId == request.PlayerId && c.Team.LeagueId == request.LeagueId, cancellationToken);
        if (existingContract != null) _context.Contracts.Remove(existingContract);

        // 4. Calculate Salary Details
        double total = request.Salary * request.Years;
        double baseSalary = Math.Floor(total / request.Years);
        double remainder = total - (baseSalary * request.Years);

        var newContract = new Contract
        {
            TeamId = targetTeam.Id,
            PlayerId = request.PlayerId,
            ContractYears = request.Years,
            SalaryYear1 = baseSalary,
            SalaryYear2 = request.Years >= 2 ? baseSalary : 0,
            SalaryYear3 = request.Years >= 3 ? baseSalary + remainder : (request.Years == 2 ? remainder : 0)
            // IsStarter removed - now exists only in DailyLineup
        };

        _context.Contracts.Add(newContract);

        // 5. Cleanup Auctions
        var activeAuctions = await _context.Auctions.Where(a => a.PlayerId == request.PlayerId && a.LeagueId == request.LeagueId).ToListAsync(cancellationToken);
        _context.Auctions.RemoveRange(activeAuctions);

        await _context.SaveChangesAsync(cancellationToken);

        return Result<string>.Success("Player successfully assigned");
    }
}
