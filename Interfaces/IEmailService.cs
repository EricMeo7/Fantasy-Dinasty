
namespace FantasyBasket.API.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string email, string resetLink);
}
