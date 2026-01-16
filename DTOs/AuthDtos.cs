using System.ComponentModel.DataAnnotations;

namespace FantasyBasket.API.DTOs;

public class RegisterDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6, ErrorMessage = "La password deve essere di almeno 6 caratteri")]
    public string Password { get; set; } = string.Empty;

    public string GeneralManagerName { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public bool IsAdmin { get; set; } = false;
    public string Email { get; set; } = string.Empty;
    public bool IsSetupComplete { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("requiresTwoFactor")]
    public bool RequiresTwoFactor { get; set; }
}

public class TwoFactorLoginDto
{
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string Code { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class FirebaseLoginDto
{
    public string Token { get; set; } = string.Empty;
}

// DTO per completare il profilo dopo la registrazione (Input)
public class SetupProfileDto
{
    [Required]
    public string GeneralManagerName { get; set; } = string.Empty;

    [Required]
    public string FantasyTeamName { get; set; } = string.Empty;
}

// DTO per visualizzare il profilo (Output) - QUELLO CHE MANCAVA
public class UserProfileDto
{
    public string Email { get; set; } = string.Empty;
    public string? GeneralManagerName { get; set; }
    public string? FantasyTeamName { get; set; }
    public bool IsSetupComplete { get; set; }
}

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}