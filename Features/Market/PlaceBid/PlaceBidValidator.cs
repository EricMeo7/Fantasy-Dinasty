using FluentValidation;

using Microsoft.Extensions.Localization;

namespace FantasyBasket.API.Features.Market.PlaceBid;

public class PlaceBidValidator : AbstractValidator<PlaceBidCommand>
{
    public PlaceBidValidator(IStringLocalizer<SharedResource> localizer)
    {
        RuleFor(x => x.PlayerId).GreaterThan(0).WithMessage(localizer["BidInvalidPlayer"]);
        RuleFor(x => x.TotalAmount).GreaterThan(0).WithMessage(localizer["BidAmountZero"]);
        RuleFor(x => x.Years).InclusiveBetween(1, 3).WithMessage(localizer["BidDuration"]);
        RuleFor(x => x.LeagueId).GreaterThan(0).WithMessage(localizer["LeagueIdRequired"]);
        RuleFor(x => x.UserId).NotEmpty().WithMessage(localizer["UserIdRequired"]);
    }
}
