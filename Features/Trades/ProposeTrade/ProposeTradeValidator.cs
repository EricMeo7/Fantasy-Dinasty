using FluentValidation;

namespace FantasyBasket.API.Features.Trades.ProposeTrade;

public class ProposeTradeValidator : AbstractValidator<ProposeTradeCommand>
{
    public ProposeTradeValidator()
    {
        RuleFor(x => x.Offers).NotEmpty().WithMessage("Lo scambio deve contenere almeno un'offerta.");
        RuleForEach(x => x.Offers).ChildRules(offer => {
            offer.RuleFor(o => o.FromUserId).NotEmpty();
            offer.RuleFor(o => o.ToUserId).NotEmpty();
            offer.RuleFor(o => o.PlayerId).GreaterThan(0);
        });
    }
}
