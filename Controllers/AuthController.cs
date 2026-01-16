using FantasyBasket.API.DTOs;
using FantasyBasket.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace FantasyBasket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly FantasyBasket.API.Interfaces.IEmailService _emailService;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IConfiguration configuration, FantasyBasket.API.Interfaces.IEmailService emailService, IWebHostEnvironment env, ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _emailService = emailService;
        _env = env;
        _logger = logger;
    }

    // POST: api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        // 1. Controllo Preliminare DB Locale
        var userExists = await _userManager.FindByEmailAsync(model.Email);
        if (userExists != null) return BadRequest(new { message = "Email già registrata nel sistema." });

        if (FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance == null)
        {
            return StatusCode(500, new { message = "Firebase non configurato." });
        }

        string firebaseUid = "";

        // 2. Crea Utente su Firebase (Source of Truth per Auth)
        try
        {
            var userArgs = new FirebaseAdmin.Auth.UserRecordArgs
            {
                Email = model.Email,
                Password = model.Password,
                DisplayName = model.GeneralManagerName,
                EmailVerified = false,
                Disabled = false
            };
            var firebaseUser = await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance.CreateUserAsync(userArgs);
            firebaseUid = firebaseUser.Uid;
        }
        catch (FirebaseAdmin.FirebaseException ex)
        {
            // Gestione specifica se utente esiste già su Firebase ma non su DB (caso raro di disallineamento)
            // In tal caso, potremmo voler proseguire o dare errore. Per ora diamo errore.
            if (ex.Message.Contains("ALREADY_EXISTS"))
                 return BadRequest(new { message = "Email già registrata su Firebase." });

            return BadRequest(new { message = $"Errore creazione Firebase: {ex.Message}" });
        }

        // 3. Crea Utente su Postgres (Profilo + Relazioni)
        var user = new ApplicationUser
        {
            Email = model.Email,
            UserName = model.Email,
            GeneralManagerName = model.GeneralManagerName,
            SecurityStamp = Guid.NewGuid().ToString()
        };

        // Nota: Creiamo l'utente locale SENZA password, perché l'auth la fa Firebase.
        var result = await _userManager.CreateAsync(user);

        if (!result.Succeeded)
        {
            // ROLLBACK: Se fallisce il DB locale, cancelliamo l'utente Firebase appena creato per mantenere coerenza
            try 
            {
                await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance.DeleteUserAsync(firebaseUid);
            }
            catch { /* Logga errore di mancato rollback */ }

            return BadRequest(result.Errors);
        }

        return Ok(new { message = "Registrazione avvenuta con successo!" });
    }

    // POST: api/auth/login
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user == null) return Unauthorized(new { message = "Email o password non validi." });

        var result = await _signInManager.PasswordSignInAsync(user.UserName!, model.Password, false, lockoutOnFailure: false);

        if (result.RequiresTwoFactor)
        {
            return Ok(new AuthResponseDto
            {
                RequiresTwoFactor = true,
                Email = user.Email!
            });
        }

        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "Email o password non validi." });
        }

        var tokenString = GenerateJwtToken(user);

        return Ok(new AuthResponseDto
        {
            Token = tokenString,
            Email = user.Email!,
        });
    }

    [HttpPost("login-2fa")]
    public async Task<ActionResult<AuthResponseDto>> Login2FA([FromBody] TwoFactorLoginDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user == null) return Unauthorized(new { message = "Utente non trovato." });

        // Rimuovi spazi o trattini dal codice se presenti
        var code = model.Code.Replace(" ", string.Empty).Replace("-", string.Empty);

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user, _userManager.Options.Tokens.AuthenticatorTokenProvider, code);

        if (!isValid)
        {
            return Unauthorized(new { message = "Codice di verifica 2FA non valido." });
        }

        var tokenString = GenerateJwtToken(user);

        return Ok(new AuthResponseDto
        {
            Token = tokenString,
            Email = user.Email!
        });
    }

    [HttpPost("firebase")]
    public async Task<ActionResult<AuthResponseDto>> FirebaseLogin([FromBody] FirebaseLoginDto model)
    {
        try
        {
            // Verifichiamo il token usando Firebase Admin SDK
            if (FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance == null)
            {
                return StatusCode(500, new { message = "Firebase non è configurato su questo server." });
            }

            var decodedToken = await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(model.Token);
            string email = decodedToken.Claims["email"]?.ToString() ?? "";
            
            if (string.IsNullOrEmpty(email)) return BadRequest(new { message = "Email non trovata nel token Firebase." });

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                // Auto-provisioning: Creiamo l'utente se non esiste
                user = new ApplicationUser
                {
                    Email = email,
                    UserName = email,
                    GeneralManagerName = decodedToken.Claims.ContainsKey("name") ? decodedToken.Claims["name"].ToString() : email.Split('@')[0],
                    SecurityStamp = Guid.NewGuid().ToString()
                };

                var result = await _userManager.CreateAsync(user); // Nessuna password necessaria
                if (!result.Succeeded) return BadRequest(result.Errors);
            }

            // Generiamo il NOSTRO token JWT per mantenere la compatibilità con il resto dell'app
            if (user.TwoFactorEnabled)
            {
                return Ok(new AuthResponseDto
                {
                    RequiresTwoFactor = true,
                    Email = user.Email!
                });
            }

            var tokenString = GenerateJwtToken(user);

            return Ok(new AuthResponseDto
            {
                Token = tokenString,
                Email = user.Email!
            });
        }
        catch (Exception ex)
        {
            return Unauthorized(new { message = $"Firebase Token invalido: {ex.Message}" });
        }
    }

    // POST: api/auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
    {
        // ANTI-ENUMERATION: Simula un ritardo casuale per evitare timing attacks
        var randomDelay = new Random().Next(100, 300);
        await Task.Delay(randomDelay);

        var user = await _userManager.FindByEmailAsync(model.Email);
        
        // Se l'utente non esiste, restituiamo comunque OK
        if (user == null)
        {
            return Ok(new { message = "Se l'indirizzo email è associato a un account, riceverai un link per reimpostare la password." });
        }

        try
        {
            // Verifica che Firebase sia configurato
            if (FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance == null)
            {
                // Fallback graceful se Firebase non è attivo (es. dev environment senza credenziali)
                return StatusCode(500, new { message = "Servizio di reset password non disponibile (Firebase Admin non configurato)." });
            }

            var baseUrl = _env.IsDevelopment() 
                ? "http://localhost:5173" 
                : "https://fantasy-dinasty.pages.dev";

            // Configurazione Link: Dove mandiamo l'utente dopo il click?
            // "url": Indirizzo della tua App React che gestirà il codice (es. /reset-password)
            var actionCodeSettings = new FirebaseAdmin.Auth.ActionCodeSettings()
            {
                Url = $"{baseUrl}/reset-password",
                HandleCodeInApp = true
            };

            // Genera il link tramire Firebase Admin SDK
            var link = await FirebaseAdmin.Auth.FirebaseAuth.DefaultInstance.GeneratePasswordResetLinkAsync(model.Email, actionCodeSettings);

            // ESTRAZIONE CODICE (oobCode) per link custom
            // Il link generato è del tipo: https://<project>.firebaseapp.com/__/auth/action?apiKey=...&mode=resetPassword&oobCode=...
            var uri = new Uri(link);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            var oobCode = query["oobCode"];

            // Costruiamo il link diretto alla nostra app React
            var customLink = $"{baseUrl}/reset-password?oobCode={oobCode}";

            // Invia l'email con il link custom
            await _emailService.SendPasswordResetEmailAsync(model.Email, customLink);

            return Ok(new { message = "Se l'indirizzo email è associato a un account, riceverai un link per reimpostare la password." });

        }
        catch (FirebaseAdmin.FirebaseException ex)
        {
            // Loggiamo l'errore server-side ma non lo mostriamo al client
            // Loggiamo l'errore server-side ma non lo mostriamo al client
            _logger.LogError(ex, "[Firebase Error] Failed to generate password reset link");
            
            // Ritorniamo sempre 200 OK per sicurezza (Anti-Enumeration)
            return Ok(new { message = "Se l'indirizzo email è associato a un account, riceverai un link per reimpostare la password." });
        }
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            // RIMOSSO "IsAdmin": L'admin si calcola per lega, non nel token globale
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}