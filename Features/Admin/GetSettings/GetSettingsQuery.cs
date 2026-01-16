using FantasyBasket.API.Common;
using FantasyBasket.API.Models;
using MediatR;

namespace FantasyBasket.API.Features.Admin.GetSettings;

public record GetSettingsQuery(int LeagueId, string RequesterUserId) : IRequest<Result<LeagueSettings>>;
