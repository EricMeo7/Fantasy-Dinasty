using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Features.Trades.AcceptTrade;

public class AcceptTradeHandler : IRequestHandler<AcceptTradeCommand, Result<string>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public AcceptTradeHandler(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    public async Task<Result<string>> Handle(AcceptTradeCommand request, CancellationToken cancellationToken)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);

        try
        {
            var trade = await _context.Trades
                .Include(t => t.Offers)
                .Include(t => t.Acceptances)
                .FirstOrDefaultAsync(t => t.Id == request.TradeId && t.LeagueId == request.LeagueId, cancellationToken);

            if (trade == null || trade.Status != TradeStatus.Pending) 
                return Result<string>.Failure(ErrorCodes.TRADE_INVALID);
            
            if (trade.ProposerId == request.UserId) 
                return Result<string>.Failure(ErrorCodes.PROPOSER_CANNOT_ACCEPT);

            if (trade.Acceptances.Any(a => a.UserId == request.UserId)) 
                return Result<string>.Failure(ErrorCodes.ALREADY_ACCEPTED);

            // 1. Register signature
            _context.TradeAcceptances.Add(new TradeAcceptance { TradeId = request.TradeId, UserId = request.UserId });
            await _context.SaveChangesAsync(cancellationToken);

            // 2. Check if all parties have signed
            var involvedUserIds = trade.Offers.SelectMany(o => new[] { o.FromUserId, o.ToUserId }).Distinct().ToList();
            var requiredSigners = involvedUserIds.Where(u => u != trade.ProposerId).ToList();

            // Refresh acceptances list (tracking the one just added)
            var currentAcceptedUserIds = await _context.TradeAcceptances
                .Where(a => a.TradeId == request.TradeId)
                .Select(a => a.UserId)
                .ToListAsync(cancellationToken);

            bool allAccepted = requiredSigners.All(u => currentAcceptedUserIds.Contains(u));

            if (allAccepted)
            {
                // FINAL EXECUTION
                
                // 3. Re-validate Financials within the isolation block
                await _auctionService.ValidateTradeFinancials(trade.Offers, request.LeagueId);

                // --- ROSTER LIMIT VALIDATION ---
                var involvedRecipients = trade.Offers.Select(o => o.ToUserId).Distinct().ToList();
                foreach (var recipientUserId in involvedRecipients)
                {
                    // For each recipient, check if they can receive the players assigned to them
                    var incomingPlayers = trade.Offers.Where(o => o.ToUserId == recipientUserId).Select(o => o.PlayerId).ToList();
                    var outgoingPlayers = trade.Offers.Where(o => o.FromUserId == recipientUserId).Select(o => o.PlayerId).ToList();

                    // Current state: what they have minus what they are sending away
                    var currentContracts = await _context.Contracts
                        .Where(c => c.Team.UserId == recipientUserId && c.Team.LeagueId == request.LeagueId)
                        .Select(c => new { c.PlayerId, c.Player.Position })
                        .AsNoTracking()
                        .ToListAsync();

                    var positionsAfterTrade = currentContracts
                        .Where(c => !outgoingPlayers.Contains(c.PlayerId))
                        .Select(c => c.Position)
                        .ToList();

                    // Add incoming players' positions
                    var incomingPositions = await _context.Players
                        .Where(p => incomingPlayers.Contains(p.Id))
                        .Select(p => p.Position)
                        .AsNoTracking()
                        .ToListAsync();
                    
                    positionsAfterTrade.AddRange(incomingPositions);

                    var validationResult = await _auctionService.ValidateRosterStateAsync(positionsAfterTrade, request.LeagueId);
                    if (!validationResult.IsSuccess)
                    {
                        return Result<string>.Failure(validationResult.Error ?? ErrorCodes.INTERNAL_ERROR);
                    }
                }

                // 4. Bulk update contracts
                var playerIds = trade.Offers.Select(o => o.PlayerId).ToList();
                var recipientUserIds = trade.Offers.Select(o => o.ToUserId).Distinct().ToList();

                var contracts = await _context.Contracts
                    .Where(c => playerIds.Contains(c.PlayerId) && c.Team.LeagueId == request.LeagueId)
                    .ToListAsync(cancellationToken);

                var targetTeamsMap = await _context.Teams
                    .Where(t => t.LeagueId == request.LeagueId && recipientUserIds.Contains(t.UserId))
                    .ToDictionaryAsync(t => t.UserId, t => t.Id, cancellationToken);

                foreach (var offer in trade.Offers)
                {
                    var contract = contracts.FirstOrDefault(c => c.PlayerId == offer.PlayerId);
                    if (contract == null) throw new Exception($"Contratto non trovato per il giocatore {offer.PlayerId}");

                    if (!targetTeamsMap.TryGetValue(offer.ToUserId, out int targetTeamId))
                        throw new Exception($"Team non trovato per l'utente {offer.ToUserId}");

                    contract.TeamId = targetTeamId;
                    // IsStarter removed - starter status managed via DailyLineup
                }

                trade.Status = TradeStatus.Accepted;
                await _context.SaveChangesAsync(cancellationToken);
                
                await transaction.CommitAsync(cancellationToken);
                return Result<string>.Success("Scambio completato!");
            }

            await transaction.CommitAsync(cancellationToken);
            return Result<string>.Success(SuccessCodes.TRADE_ACCEPTED);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            return Result<string>.Failure(ErrorCodes.TRADE_FAILED);
        }
    }
}
