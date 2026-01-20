using FantasyBasket.API.Data;
using FantasyBasket.API.Interfaces;
using FantasyBasket.API.Models;
using FantasyBasket.API.Models.Dto;
using Microsoft.EntityFrameworkCore;

namespace FantasyBasket.API.Services;

public class AuctionService
{
    private readonly ApplicationDbContext _context;
    private readonly INbaDataService _nbaDataService;

    public AuctionService(ApplicationDbContext context, INbaDataService nbaDataService)
    {
        _context = context;
        _nbaDataService = nbaDataService;
    }

    // --- HELPER SICURO PER LE DATE ---
    private int SafeGetStartYear(string season)
    {
        if (string.IsNullOrWhiteSpace(season)) season = _nbaDataService.GetCurrentSeason();
        var parts = season.Split('-');
        if (parts.Length > 0 && int.TryParse(parts[0], out int year))
        {
            return year;
        }
        return DateTime.UtcNow.Year; // Fallback generico
    }

    // --- REGOLA 8: Calcolo stipendi ---
    public (double y1, double y2, double y3) CalculateSalaryStructure(double total, int years)
    {
        if (years < 1) years = 1;
        if (total <= 0) return (0, 0, 0);

        double baseSalary = Math.Floor(total / years);
        double remainder = total - (baseSalary * years);

        double y1 = baseSalary;
        double y2 = (years >= 2) ? baseSalary : 0;
        double y3 = (years == 3) ? baseSalary : 0;

        if (years == 2) y2 += remainder;
        if (years == 3) y3 += remainder;

        return (y1, y2, y3);
    }

    // --- REGOLA 8: Validazione offerta ---
    public bool IsBidValid(Auction auction, double newTotal, int newYears)
    {
        if (auction.HighBidderId == null || auction.CurrentOfferTotal <= 0)
            return newTotal >= 1;

        double currentY1 = Math.Floor(auction.CurrentOfferTotal / Math.Max(1, auction.CurrentOfferYears));
        double newY1 = Math.Floor(newTotal / Math.Max(1, newYears));

        if (newY1 > currentY1) return true;
        if (newY1 == currentY1 && newYears > auction.CurrentOfferYears) return true;

        return false;
    }

    // --- BASE D'ASTA (Aggiornato con LeagueId per leggere MinBidAmount corretto) ---
    public async Task<double> GetBaseAuctionPriceAsync(int playerId, int leagueId)
    {
        var league = await _context.Leagues.AsNoTracking().FirstOrDefaultAsync(l => l.Id == leagueId);
        string currentSeason = league?.CurrentSeason ?? _nbaDataService.GetCurrentSeason();
        double defaultMin = league?.MinBidAmount ?? 1.0; 

        // FETCH SETTINGS
        var settings = await _context.LeagueSettings.AsNoTracking().FirstOrDefaultAsync(s => s.LeagueId == leagueId);
        double wP = settings?.PointWeight ?? 1.0;
        double wR = settings?.ReboundWeight ?? 1.2;
        double wA = settings?.AssistWeight ?? 1.5;
        double wS = settings?.StealWeight ?? 3.0;
        double wB = settings?.BlockWeight ?? 3.0;
        double wT = settings?.TurnoverWeight ?? -1.0;

        string prevSeason = CalculatePreviousSeason(currentSeason);

        var prevStat = await _context.PlayerSeasonStats
            .AsNoTracking()
            .Where(s => s.PlayerId == playerId && s.Season == prevSeason)
            .FirstOrDefaultAsync();

        double calculatedVal = 0;

        if (prevStat != null)
        {
            // Calculate using PREVIOUS season stats
             calculatedVal = (prevStat.AvgPoints * wP) + 
                             (prevStat.AvgRebounds * wR) + 
                             (prevStat.AvgAssists * wA) + 
                             (prevStat.AvgSteals * wS) + 
                             (prevStat.AvgBlocks * wB) + 
                             (prevStat.AvgTurnovers * wT);
        }
        else
        {
            // Fallback to CURRENT season stats
            var player = await _context.Players.FindAsync(playerId);
            if (player != null)
            {
                calculatedVal = (player.AvgPoints * wP) + 
                                (player.AvgRebounds * wR) + 
                                (player.AvgAssists * wA) + 
                                (player.AvgSteals * wS) + 
                                (player.AvgBlocks * wB) + 
                                (player.AvgTurnovers * wT);
            }
        }

        if (calculatedVal <= 0) return defaultMin;

        double basePrice = Math.Round(calculatedVal, MidpointRounding.AwayFromZero);
        return basePrice < defaultMin ? defaultMin : basePrice;
    }

    private string CalculatePreviousSeason(string currentSeason)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(currentSeason)) return _nbaDataService.GetPreviousSeason();
            var parts = currentSeason.Split('-');
            if (parts.Length < 2) return _nbaDataService.GetPreviousSeason();
            int startYear = int.Parse(parts[0]);
            int prevStartYear = startYear - 1;
            string endPart = startYear.ToString().Substring(2, 2);
            return $"{prevStartYear}-{endPart}";
        }
        catch { return _nbaDataService.GetPreviousSeason(); }
    }

    // --- CAP SPACE (CORRETTO PER L'ERRORE) ---
    public async Task<double> GetTeamCapSpace(string userId, int leagueId)
    {
        // 1. Recupera impostazioni lega
        var league = await _context.Leagues.AsNoTracking().FirstOrDefaultAsync(l => l.Id == leagueId);
        if (league == null) return 0;

        double cap = league.SalaryCap;
        string currentSeason = league.CurrentSeason;

        // 2. Trova il TeamId dell'utente in questa lega
        var team = await _context.Teams
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);
        if (team == null) return 0; // Utente non ha squadra in questa lega

        // 3. Calcola Stipendi Attivi (Usando Contracts, non Players)
        double activeContracts = await _context.Contracts
            .Where(c => c.TeamId == team.Id)
            .SumAsync(c => c.SalaryYear1);

        // 4. Calcola Dead Money (Filtrando per LeagueId e UserId)
        double deadMoney = await _context.DeadCaps
            .Where(d => d.TeamId == userId && d.LeagueId == leagueId && d.Season == currentSeason)
            .SumAsync(d => d.Amount);

        // 5. Calcola Soldi Congelati in Aste Attive (Filtrando per LeagueId e UserId)
        double frozenInAuctions = await _context.Auctions
            .Where(a => a.HighBidderId == userId && a.LeagueId == leagueId && a.IsActive)
            .SumAsync(a => a.CurrentYear1Amount);

        return cap - (activeContracts + deadMoney + frozenInAuctions);
    }

    // --- PENALITÀ TAGLIO ---
    public async Task ProcessDropPenalty(Contract contract, string userId, int leagueId)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null) return;

        string currentSeason = league.CurrentSeason;
        int startYear = SafeGetStartYear(currentSeason);

        string s1 = currentSeason;
        string s2 = $"{startYear + 1}-{startYear + 2 - 2000}";
        string s3 = $"{startYear + 2}-{startYear + 3 - 2000}";

        // Recuperiamo il cognome dal player collegato per il messaggio di log
        string playerName = contract.Player?.LastName ?? "Giocatore";

        // ANNO 1
        _context.DeadCaps.Add(new TeamDeadCap
        {
            TeamId = userId,
            LeagueId = leagueId,
            Season = s1,
            Amount = contract.SalaryYear1,
            Reason = $"Taglio {playerName} (Y1)"
        });

        // ANNO 2
        if (contract.ContractYears >= 2)
        {
            double penalty = Math.Max(1, Math.Ceiling(contract.SalaryYear2 * 0.10));
            _context.DeadCaps.Add(new TeamDeadCap
            {
                TeamId = userId,
                LeagueId = leagueId,
                Season = s2,
                Amount = penalty,
                Reason = $"Taglio {playerName} (Y2)"
            });
        }

        // ANNO 3
        if (contract.ContractYears == 3)
        {
            double penalty = Math.Max(1, Math.Ceiling(contract.SalaryYear3 * 0.10));
            _context.DeadCaps.Add(new TeamDeadCap
            {
                TeamId = userId,
                LeagueId = leagueId,
                Season = s3,
                Amount = penalty,
                Reason = $"Taglio {playerName} (Y3)"
            });
        }
    }

    // --- REPORT FINANZIARIO ---
    public async Task<TeamFinanceOverviewDto> GetTeamFinanceOverview(string userId, int leagueId)
    {
        var league = await _context.Leagues.AsNoTracking().FirstOrDefaultAsync(l => l.Id == leagueId);
        if (league == null) return new TeamFinanceOverviewDto();

        double cap = league.SalaryCap;
        string s1 = league.CurrentSeason;
        int startYear = SafeGetStartYear(s1);
        string s2 = $"{startYear + 1}-{startYear + 2 - 2000}";
        string s3 = $"{startYear + 2}-{startYear + 3 - 2000}";

        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);
        if (team == null) return new TeamFinanceOverviewDto();

        // Contratti
        var contracts = await _context.Contracts
            .AsNoTracking()
            .Where(c => c.TeamId == team.Id)
            .Select(c => new { c.SalaryYear1, c.SalaryYear2, c.SalaryYear3, c.ContractYears })
            .ToListAsync();

        // Dead Money
        var deadCaps = await _context.DeadCaps
            .AsNoTracking()
            .Where(d => d.TeamId == userId && d.LeagueId == leagueId)
            .Select(d => new { d.Reason, d.Season, d.Amount })
            .ToListAsync();

        var overview = new TeamFinanceOverviewDto();

        overview.Years.Add(new SeasonBudgetDto
        {
            Season = s1,
            TotalCap = cap,
            Contracts = contracts.Sum(c => c.SalaryYear1),
            DeadMoney = deadCaps.Where(d => d.Season == s1).Sum(d => d.Amount)
        });

        overview.Years.Add(new SeasonBudgetDto
        {
            Season = s2,
            TotalCap = cap,
            Contracts = contracts.Where(c => c.ContractYears >= 2).Sum(c => c.SalaryYear2),
            DeadMoney = deadCaps.Where(d => d.Season == s2).Sum(d => d.Amount)
        });

        overview.Years.Add(new SeasonBudgetDto
        {
            Season = s3,
            TotalCap = cap,
            Contracts = contracts.Where(c => c.ContractYears >= 3).Sum(c => c.SalaryYear3),
            DeadMoney = deadCaps.Where(d => d.Season == s3).Sum(d => d.Amount)
        });

        overview.DeadCapDetails = deadCaps.Select(d => new DeadCapDetailDto
        {
            PlayerName = d.Reason,
            Season = d.Season,
            Amount = d.Amount
        }).OrderBy(d => d.Season).ToList();

        return overview;
    }

    // --- SIMULAZIONE TAGLIO ---
    public async Task<List<DeadCapDetailDto>> SimulateDropPenaltyAsync(int playerId, string userId, int leagueId)
    {
        var league = await _context.Leagues.FindAsync(leagueId);
        if (league == null) return new List<DeadCapDetailDto>();

        string currentSeason = league.CurrentSeason;
        int startYear = SafeGetStartYear(currentSeason);
        string s1 = currentSeason;
        string s2 = $"{startYear + 1}-{startYear + 2 - 2000}";
        string s3 = $"{startYear + 2}-{startYear + 3 - 2000}";

        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);
        if (team == null) return new List<DeadCapDetailDto>();

        var contract = await _context.Contracts
            .Include(c => c.Player)
            .FirstOrDefaultAsync(c => c.PlayerId == playerId && c.TeamId == team.Id);

        if (contract == null) return new List<DeadCapDetailDto>();

        var penalties = new List<DeadCapDetailDto>();

        penalties.Add(new DeadCapDetailDto
        {
            Season = s1,
            Amount = contract.SalaryYear1,
            PlayerName = $"{contract.Player.LastName} (Garantito Y1)"
        });

        if (contract.ContractYears >= 2)
        {
            double penalty = Math.Max(1, Math.Ceiling(contract.SalaryYear2 * 0.10));
            penalties.Add(new DeadCapDetailDto
            {
                Season = s2,
                Amount = penalty,
                PlayerName = $"{contract.Player.LastName} (Buyout Y2)"
            });
        }

        if (contract.ContractYears == 3)
        {
            double penalty = Math.Max(1, Math.Ceiling(contract.SalaryYear3 * 0.10));
            penalties.Add(new DeadCapDetailDto
            {
                Season = s3,
                Amount = penalty,
                PlayerName = $"{contract.Player.LastName} (Buyout Y3)"
            });
        }

        return penalties;
    }

    public async Task<double> GetFreeSpaceForYear(string userId, int leagueId, int yearIndex)
    {
        var league = await _context.Leagues.AsNoTracking().FirstOrDefaultAsync(l => l.Id == leagueId);
        if (league == null) return 0;

        double cap = league.SalaryCap;
        string currentSeason = league.CurrentSeason;

        // Determina la stringa della stagione in base all'indice (1=Current, 2=Next...)
        // (Qui semplifichiamo assumendo che DeadCaps usino la stringa corretta calcolata altrove)
        // Per ora calcoliamo solo sui contratti, che è la parte grossa.
        // Se vuoi precisione millimetrica sui DeadCaps futuri, dovresti calcolare la stringa stagione esatta.

        var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);
        if (team == null) return 0;

        // Somma Stipendi Contratti
        double contractsSum = await _context.Contracts
            .Where(c => c.TeamId == team.Id)
            .SumAsync(c => yearIndex == 1 ? c.SalaryYear1 :
                           yearIndex == 2 ? c.SalaryYear2 :
                           c.SalaryYear3);

        // Somma Dead Money (Opzionale: per ora consideriamo solo anno 1 per semplicità o implementa logica date)
        // Per una validazione strict sui 3 anni, dovresti filtrare i DeadCaps per la stagione corretta.
        // Qui assumiamo che i DeadCaps siano rilevanti principalmente sull'anno corrente per la validazione trade.
        double deadMoney = 0;
        if (yearIndex == 1)
        {
            deadMoney = await _context.DeadCaps
                .Where(d => d.TeamId == userId && d.LeagueId == leagueId && d.Season == currentSeason)
                .SumAsync(d => d.Amount);
        }

        // Soldi congelati in aste (solo Anno 1)
        double frozen = 0;
        if (yearIndex == 1)
        {
            frozen = await _context.Auctions
                .Where(a => a.HighBidderId == userId && a.LeagueId == leagueId && a.IsActive)
                .SumAsync(a => a.CurrentYear1Amount);
        }

        return cap - (contractsSum + deadMoney + frozen);
    }

    public async Task ValidateTradeFinancials(List<TradeOffer> offers, int leagueId)
    {
        // 1. Identifica tutti gli utenti coinvolti
        var involvedUsers = offers.SelectMany(o => new[] { o.FromUserId, o.ToUserId }).Distinct().ToList();

        foreach (var userId in involvedUsers)
        {
            // Recuperiamo il nome per dare un errore chiaro
            var team = await _context.Teams.FirstOrDefaultAsync(t => t.UserId == userId && t.LeagueId == leagueId);
            string teamName = team?.Name ?? "Una squadra";

            // 2. Controllo su 3 Anni
            for (int year = 1; year <= 3; year++)
            {
                // A. Spazio attuale
                double currentFreeSpace = await GetFreeSpaceForYear(userId, leagueId, year);

                // B. Stipendi in USCITA (che libero)
                var outgoingPlayerIds = offers.Where(o => o.FromUserId == userId).Select(o => o.PlayerId).ToList();
                double outgoingSalary = 0;
                if (outgoingPlayerIds.Any())
                {
                    outgoingSalary = await _context.Contracts
                        .Where(c => c.Team.LeagueId == leagueId && outgoingPlayerIds.Contains(c.PlayerId))
                        .SumAsync(c => year == 1 ? c.SalaryYear1 : year == 2 ? c.SalaryYear2 : c.SalaryYear3);
                }

                // C. Stipendi in ENTRATA (che mi carico)
                var incomingPlayerIds = offers.Where(o => o.ToUserId == userId).Select(o => o.PlayerId).ToList();
                double incomingSalary = 0;
                if (incomingPlayerIds.Any())
                {
                    incomingSalary = await _context.Contracts
                        .Where(c => c.Team.LeagueId == leagueId && incomingPlayerIds.Contains(c.PlayerId))
                        .SumAsync(c => year == 1 ? c.SalaryYear1 : year == 2 ? c.SalaryYear2 : c.SalaryYear3);
                }

                // D. Verifica
                double projectedSpace = currentFreeSpace + outgoingSalary - incomingSalary;

                if (projectedSpace < 0)
                {
                    throw new InvalidOperationException($"Lo scambio non è valido: {teamName} sforerebbe il Cap nell'Anno {year} ({projectedSpace:F1}M).");
                }
            }
        }
    }
    // --- PROCESSA ASTE SCADUTE (Chiamato dal Worker o on-demand) ---
    public async Task ProcessExpiredAuctionsAsync(CancellationToken ct, int? leagueId = null)
    {
        var now = DateTime.UtcNow;

        // 1. Trova aste scadute (Optionally filter by league)
        var query = _context.Auctions.Where(a => a.IsActive && a.EndTime <= now);
        
        if (leagueId.HasValue)
        {
            query = query.Where(a => a.LeagueId == leagueId.Value);
        }

        var expiredAuctions = await query.ToListAsync(ct);

        if (!expiredAuctions.Any()) return;

        foreach (var auction in expiredAuctions)
        {
            // Se c'è un vincitore, crea il contratto
            if (!string.IsNullOrEmpty(auction.HighBidderId))
            {
                var team = await _context.Teams
                    .FirstOrDefaultAsync(t => t.UserId == auction.HighBidderId && t.LeagueId == auction.LeagueId, ct);

                if (team != null)
                {
                    // Calcola stipendio strutturato (Regola 8)
                    var (y1, y2, y3) = CalculateSalaryStructure(auction.CurrentOfferTotal, auction.CurrentOfferYears);

                    var contract = new Contract
                    {
                        PlayerId = auction.PlayerId,
                        TeamId = team.Id,
                        SalaryYear1 = y1,
                        SalaryYear2 = y2,
                        SalaryYear3 = y3,
                        ContractYears = auction.CurrentOfferYears
                        // Eventuali altri campi di default
                    };

                    _context.Contracts.Add(contract);
                }
            }

            // Rimuovi l'asta (chiusa)
            _context.Auctions.Remove(auction);
        }

        await _context.SaveChangesAsync(ct);
    }
}