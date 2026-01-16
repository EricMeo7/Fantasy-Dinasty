using FantasyBasket.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using QRCoder;
using System.Text;
using System.Text.Encodings.Web;

namespace FantasyBasket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TwoFactorController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly UrlEncoder _urlEncoder;

    public TwoFactorController(UserManager<ApplicationUser> userManager, UrlEncoder urlEncoder)
    {
        _userManager = userManager;
        _urlEncoder = urlEncoder;
    }

    [HttpPost("setup")]
    public async Task<IActionResult> SetupTwoFactor()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(unformattedKey))
        {
            await _userManager.ResetAuthenticatorKeyAsync(user);
            unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        }

        var email = await _userManager.GetEmailAsync(user);
        var authenticatorUri = GenerateQrCodeUri(email!, unformattedKey!);

        // Generate QR Code
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(authenticatorUri, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeImage = qrCode.GetGraphic(20);
        var qrCodeBase64 = Convert.ToBase64String(qrCodeImage);

        return Ok(new
        {
            SharedKey = unformattedKey,
            AuthenticatorUri = authenticatorUri,
            QrCodeImage = $"data:image/png;base64,{qrCodeBase64}"
        });
    }

    [HttpPost("enable")]
    public async Task<IActionResult> EnableTwoFactor([FromBody] TwoFactorVerifyDto model)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var verificationCode = model.Code.Replace(" ", string.Empty).Replace("-", string.Empty);
        var is2faTokenValid = await _userManager.VerifyTwoFactorTokenAsync(
            user, _userManager.Options.Tokens.AuthenticatorTokenProvider, verificationCode);

        if (!is2faTokenValid)
        {
            return BadRequest(new { message = "Codice di verifica non valido." });
        }

        await _userManager.SetTwoFactorEnabledAsync(user, true);
        return Ok(new { message = "2FA abilitata con successo." });
    }

    [HttpPost("disable")]
    public async Task<IActionResult> DisableTwoFactor()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        return Ok(new { message = "2FA disabilitata." });
    }

    private string GenerateQrCodeUri(string email, string unformattedKey)
    {
        return string.Format(
            "otpauth://totp/{0}:{1}?secret={2}&issuer={0}&digits=6",
            _urlEncoder.Encode("FantasyBasket"),
            _urlEncoder.Encode(email),
            unformattedKey);
    }
}

public class TwoFactorVerifyDto
{
    public string Code { get; set; } = string.Empty;
}
