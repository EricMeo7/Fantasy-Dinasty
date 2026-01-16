
using FantasyBasket.API.Interfaces;

namespace FantasyBasket.API.Services;

public class ConsoleMockEmailService : IEmailService
{
    private readonly ILogger<ConsoleMockEmailService> _logger;

    public ConsoleMockEmailService(ILogger<ConsoleMockEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendPasswordResetEmailAsync(string email, string resetLink)
    {
        _logger.LogWarning("==================================================================================");
        _logger.LogWarning($"[MOCK EMAIL SERVICE] Password Reset Requested for: {email}");
        _logger.LogWarning($"[MOCK EMAIL SERVICE] Link: {resetLink}");
        _logger.LogWarning("==================================================================================");
        
        // In un'app reale, qui useremmo SmtpClient o SendGrid
        return Task.CompletedTask;
    }
}
