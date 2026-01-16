using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.GenerateSchedule;

public record GenerateScheduleCommand(int LeagueId, string RequesterUserId, int PlayoffTeams, Models.ScheduleMode Mode) : IRequest<Result<string>>;
