using FantasyBasket.API.Common;
using FantasyBasket.API.Models;
using MediatR;

namespace FantasyBasket.API.Features.Admin.UpdateSettings;

public record UpdateSettingsCommand(int LeagueId, string RequesterUserId, LeagueSettings Settings) : IRequest<Result<string>>;
