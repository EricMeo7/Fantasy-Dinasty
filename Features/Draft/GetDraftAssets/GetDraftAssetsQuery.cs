using MediatR;

namespace FantasyBasket.API.Features.Draft.GetDraftAssets;

public record GetDraftAssetsQuery(int TeamId) : IRequest<List<DraftAssetDto>>;
