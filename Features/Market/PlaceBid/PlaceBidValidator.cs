using FluentValidation;

namespace FantasyBasket.API.Features.Market.PlaceBid;

public class PlaceBidValidator : AbstractValidator<PlaceBidCommand>
{
    public PlaceBidValidator()
    {
        RuleFor(x => x.PlayerId).GreaterThan(0).WithMessage("ID Giocatore non valido.");
        RuleFor(x => x.TotalAmount).GreaterThan(0).WithMessage("L'offerta deve essere maggiore di 0.");
        RuleFor(x => x.Years).InclusiveBetween(1, 3).WithMessage("Il contratto deve durare tra 1 e 3 anni.");
        RuleFor(x => x.LeagueId).GreaterThan(0).WithMessage("League ID richiesto.");
        RuleFor(x => x.UserId).NotEmpty().WithMessage("User ID richiesto.");
    }
}
