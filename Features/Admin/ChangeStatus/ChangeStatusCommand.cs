using FantasyBasket.API.Common;
using FantasyBasket.API.Models;
using MediatR;

namespace FantasyBasket.API.Features.Admin.ChangeStatus;

public record ChangeStatusCommand(int LeagueId, string RequesterUserId, LeagueState NewState) : IRequest<Result<string>>;
