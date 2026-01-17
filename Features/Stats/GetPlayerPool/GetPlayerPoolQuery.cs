using MediatR;

namespace FantasyBasket.API.Features.Stats.GetPlayerPool;

public class GetPlayerPoolQuery : IRequest<PlayerPoolResponse>
{
    public int LeagueId { get; set; }
    public string? Season { get; set; } // Null for "Current"
    
    // Filters
    public string? NameSearch { get; set; }
    public string? Position { get; set; }
    public string? NbaTeam { get; set; }
    public double? MinPts { get; set; }
    public double? MinReb { get; set; }
    public double? MinAst { get; set; }
    public double? MinStl { get; set; }
    public double? MinBlk { get; set; }
    public double? MinFpts { get; set; }
    public double? MinMin { get; set; }
    public int? MinGp { get; set; }
    public double? MinFgPct { get; set; }
    public double? Min3pPct { get; set; }
    public double? MinFtPct { get; set; }
    public bool? OnlyFreeAgents { get; set; }

    // Pagination
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;

    // Sorting
    public string SortBy { get; set; } = "FantasyPoints";
    public bool IsDescending { get; set; } = true;
}
