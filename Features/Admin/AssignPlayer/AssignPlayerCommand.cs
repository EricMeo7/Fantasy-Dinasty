using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.AssignPlayer;

public record AssignPlayerCommand(int LeagueId, string RequesterUserId, int PlayerId, string TargetUserId, double Salary, int Years) : IRequest<Result<string>>;
