using MediatR;

namespace FantasyBasket.API.Features.Draft.AssignDraftPick;

public record AssignDraftPickCommand(int PickId, int PlayerId) : IRequest<AssignDraftPickResult>;
