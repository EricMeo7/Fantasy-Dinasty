using MediatR;

namespace FantasyBasket.API.Features.Draft.GetDraftBoard;

public record GetDraftBoardQuery(int LeagueId, int Season) : IRequest<List<DraftBoardSlotDto>>;
