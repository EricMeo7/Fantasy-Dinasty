using FantasyBasket.API.Common;
using FantasyBasket.API.Models;
using MediatR;

namespace FantasyBasket.API.Features.Admin.GetStatus;

public record GetStatusQuery(int LeagueId) : IRequest<Result<LeagueState>>;
