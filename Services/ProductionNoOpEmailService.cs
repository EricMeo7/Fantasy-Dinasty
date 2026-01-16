using FantasyBasket.API.Interfaces;

namespace FantasyBasket.API.Services;

public class ProductionNoOpEmailService : IEmailService
{
    private readonly ILogger<ProductionNoOpEmailService> _logger;

    public ProductionNoOpEmailService(ILogger<ProductionNoOpEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendPasswordResetEmailAsync(string email, string resetLink)
    {
        // SICUREZZA: NON loggare il resetLink in produzione!
        _logger.LogError($"[SECURE MAIL] Tentativo di invio email a {email} fallito. Servizio SMTP non configurato.");
        _logger.LogWarning("Configurare un provider email reale (SendGrid/SMTP) in Program.cs per l'ambiente di produzione.");
        
        return Task.CompletedTask;
    }
}
