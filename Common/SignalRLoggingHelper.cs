using System.Text.Json;

namespace FantasyBasket.API.Common;

public static class SignalRLoggingHelper
{
    private static readonly JsonSerializerOptions _options = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static string GetPayloadInfo(object? payload)
    {
        if (payload == null) return "Payload: NULL (0 bytes)";
        
        try
        {
            var json = JsonSerializer.Serialize(payload, _options);
            var bytes = System.Text.Encoding.UTF8.GetByteCount(json);
            return $"Type: {payload.GetType().Name}, Size: {bytes} bytes";
        }
        catch (Exception ex)
        {
            return $"Type: {payload.GetType().Name}, Error estimating size: {ex.Message}";
        }
    }
}
