using FluentValidation;

using Microsoft.Extensions.Localization;

namespace FantasyBasket.API.Features.Trades.ProposeTrade;

public class ProposeTradeValidator : AbstractValidator<ProposeTradeCommand>
{
    public ProposeTradeValidator(IStringLocalizer<SharedResource> localizer)
    {
        RuleFor(x => x.Offers).NotEmpty().WithMessage(localizer["TradeOfferRequired"]);
        RuleForEach(x => x.Offers).ChildRules(offer => {
            offer.RuleFor(o => o.FromUserId).NotEmpty();
            offer.RuleFor(o => o.ToUserId).NotEmpty();
            offer.RuleFor(o => o.PlayerId).GreaterThan(0);
        });
    }
}
