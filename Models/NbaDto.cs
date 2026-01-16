using System.Text.Json.Serialization;

namespace FantasyBasket.API.Models.NbaDto; // Puoi metterle dove preferisci o dentro il Service

public class NbaStatsResponse
{
    [JsonPropertyName("resultSets")]
    public required List<NbaResultSet> ResultSets { get; set; }
}

public class NbaResultSet
{
    [JsonPropertyName("headers")]
    public required List<string> Headers { get; set; }

    // Usiamo JsonElement per poter leggere sia stringhe che numeri in modo sicuro
    [JsonPropertyName("rowSet")]
    public required List<List<System.Text.Json.JsonElement>> RowSet { get; set; }
}