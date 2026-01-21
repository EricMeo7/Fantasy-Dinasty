using FantasyBasket.API.Common;
using FantasyBasket.API.Data;
using FantasyBasket.API.Models;
using FantasyBasket.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace FantasyBasket.API.Features.Market.PlaceBid;

public class PlaceBidHandler : IRequestHandler<PlaceBidCommand, Result<PlaceBidResult>>
{
    private readonly ApplicationDbContext _context;
    private readonly AuctionService _auctionService;

    public PlaceBidHandler(ApplicationDbContext context, AuctionService auctionService)
    {
        _context = context;
        _auctionService = auctionService;
    }

    public async Task<Result<PlaceBidResult>> Handle(PlaceBidCommand request, CancellationToken cancellationToken)
    {
        // 0. Transazione Serializzabile per evitare Race Conditions su Cap
        using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        
        try 
        {
            // 1. Trova l'asta esistente
            var auction = await _context.Auctions
                .OrderByDescending(a => a.Id)
                .FirstOrDefaultAsync(a => a.PlayerId == request.PlayerId && a.LeagueId == request.LeagueId && a.IsActive, cancellationToken);

            // --- CREAZIONE ASTA SE NON ESISTE ---
            if (auction == null)
            {
                double basePrice = await _auctionService.GetBaseAuctionPriceAsync(request.PlayerId, request.LeagueId);
                double proposedAnnualValue = Math.Floor(request.TotalAmount / Math.Max(1, request.Years));

                if (proposedAnnualValue < basePrice)
                {
                    return Result<PlaceBidResult>.Failure(ErrorCodes.BID_TOO_LOW);
                }

                bool taken = await _context.Contracts
                    .AnyAsync(c => c.PlayerId == request.PlayerId && c.Team.LeagueId == request.LeagueId, cancellationToken);
                
                if (taken) return Result<PlaceBidResult>.Failure(ErrorCodes.PLAYER_ALREADY_TAKEN);

                auction = new Auction
                {
                    LeagueId = request.LeagueId,
                    PlayerId = request.PlayerId,
                    EndTime = DateTime.UtcNow.AddHours(24),
                    StartTime = DateTime.UtcNow,
                    IsActive = true,
                    HighBidderId = null,
                    CurrentOfferTotal = 0,
                    CurrentOfferYears = 0
                };
                _context.Auctions.Add(auction);
                await _context.SaveChangesAsync(cancellationToken); // Save to generate ID if needed, though not strictly required here
            }

            // 2. Validazioni Regolamento
            if (!_auctionService.IsBidValid(auction, request.TotalAmount, request.Years))
            {
                 return Result<PlaceBidResult>.Failure(ErrorCodes.INVALID_BID);
            }

            // ROSTER LIMIT VALIDATION
            var rosterValidation = await _auctionService.ValidateRosterLimitsAsync(request.UserId, request.LeagueId, request.PlayerId);
            if (!rosterValidation.IsSuccess)
            {
                return Result<PlaceBidResult>.Failure(rosterValidation.Error ?? ErrorCodes.INTERNAL_ERROR);
            }

            // 3. Validazione Salary Cap
            var salaries = _auctionService.CalculateSalaryStructure(request.TotalAmount, request.Years);
            double firstYearCost = salaries.y1;

            double availableSpace = await _auctionService.GetTeamCapSpace(request.UserId, request.LeagueId);

            // Sblocco fondi se sto rilanciando su me stesso
            if (auction.HighBidderId == request.UserId)
            {
                availableSpace += auction.CurrentYear1Amount;
            }

            if (availableSpace < firstYearCost)
            {
                return Result<PlaceBidResult>.Failure(ErrorCodes.INSUFFICIENT_CAP);
            }

            // 4. Registra Offerta
            auction.HighBidderId = request.UserId;
            auction.CurrentOfferTotal = request.TotalAmount;
            auction.CurrentOfferYears = request.Years;
            auction.CurrentYear1Amount = firstYearCost;

            // Anti-Sniping
            if ((auction.EndTime - DateTime.UtcNow).TotalMinutes < 5)
                auction.EndTime = DateTime.UtcNow.AddMinutes(5);

            // Log
            var bidLog = new Bid
            {
                AuctionId = auction.Id, // Link corretto
                LeagueId = request.LeagueId,
                BidderId = request.UserId,
                TotalAmount = request.TotalAmount,
                Years = request.Years,
                Timestamp = DateTime.UtcNow
            };
            _context.Bids.Add(bidLog);

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Result<PlaceBidResult>.Success(new PlaceBidResult
            {
                Message = "Offerta piazzata con successo!",
                EndTime = auction.EndTime,
                Year1Cost = firstYearCost
            });
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            // Log exception here in real app
            return Result<PlaceBidResult>.Failure(ErrorCodes.INTERNAL_ERROR);
        }
    }
}
