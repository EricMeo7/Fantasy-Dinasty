using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Admin.AssignPlayer;

public class AssignPlayerHandler : IRequestHandler<AssignPlayerCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public AssignPlayerHandler(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    public async Task<Result<string>> Handle(AssignPlayerCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Admin
        var isAdmin = await _context.Teams
            .AnyAsync(t => t.UserId == request.RequesterUserId && t.LeagueId == request.LeagueId && t.IsAdmin, cancellationToken);
        if (!isAdmin) return Result<string>.Failure(ErrorCodes.ACCESS_DENIED);

        // 2. Validate Target Team
        var targetTeamId = await _context.Teams
            .Where(t => t.UserId == request.TargetUserId && t.LeagueId == request.LeagueId)
            .Select(t => t.Id)
            .OrderBy(id => id)
            .FirstOrDefaultAsync(cancellationToken);
        if (targetTeamId == 0) return Result<string>.Failure(ErrorCodes.TARGET_TEAM_NOT_FOUND);

        // 3. Validate Roster Limits (Admin can bypass if we want, but usually better to respect them unless forced)
        // We assume admin wants to respect limits unless we add a Force flag.
        var rosterValidation = await _auctionService.ValidateRosterLimitsAsync(request.TargetUserId, request.LeagueId, request.PlayerId);
        if (!rosterValidation.IsSuccess) return Result<string>.Failure(rosterValidation.Error ?? ErrorCodes.INTERNAL_ERROR);

        // 3. Remove Old Contract (Transfer/Correction)
        var existingContract = await _context.Contracts
            .OrderBy(c => c.Id)
            .FirstOrDefaultAsync(c => c.PlayerId == request.PlayerId && c.Team.LeagueId == request.LeagueId, cancellationToken);
        if (existingContract != null) _context.Contracts.Remove(existingContract);

        // 4. Calculate Salary Details
        double total = request.Salary * request.Years;
        double baseSalary = Math.Floor(total / request.Years);
        double remainder = total - (baseSalary * request.Years);

        var newContract = new Contract
        {
            TeamId = targetTeamId,
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
