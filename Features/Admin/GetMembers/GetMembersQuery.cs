using FantasyBasket.API.Common;
using MediatR;

namespace FantasyBasket.API.Features.Admin.GetMembers;

public record GetMembersQuery(int LeagueId, string RequesterUserId) : IRequest<Result<List<LeagueMemberDto>>>;
