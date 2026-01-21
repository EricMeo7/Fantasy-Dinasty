using FantasyBasket.API.Data;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Draft.AssignDraftPick;

public class AssignDraftPickHandler : IRequestHandler<AssignDraftPickCommand, AssignDraftPickResult>
{
    private readonly IDraftService _draftService;
    private readonly ApplicationDbContext _context;

    public AssignDraftPickHandler(IDraftService draftService, ApplicationDbContext context)
    {
        _draftService = draftService;
        _context = context;
    }

    public async Task<AssignDraftPickResult> Handle(AssignDraftPickCommand request, CancellationToken cancellationToken)
    {
        var pick = await _draftService.AssignPlayerToPickAsync(request.PickId, request.PlayerId);

        if (pick == null)
        {
            return new AssignDraftPickResult
            {
                Success = false,
                Message = "Failed to assign player to pick. Pick may not exist, already be drafted, or player may not exist."
            };
        }

        // Get the created contract
        var contract = await _context.Contracts
            .Where(c => c.PlayerId == request.PlayerId && c.IsRookieContract)
            .OrderByDescending(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return new AssignDraftPickResult
        {
            Success = true,
            Message = $"Player assigned to pick #{pick.SlotNumber}. Rookie contract created.",
            ContractId = contract?.Id,
            RookieSalary = contract?.SalaryYear1
        };
    }
}
