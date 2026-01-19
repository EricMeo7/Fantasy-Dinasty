using FantasyBasket.API.DTOs;
using FantasyBasket.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FantasyBasket.API.Common;

namespace FantasyBasket.API.Controllers;

[Authorize] // Protegge tutto il controller: serve il Token JWT
[Route("api/[controller]")]
[ApiController]
public class ProfileController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    // GET: api/profile
    // Serve al Frontend per scaricare i dati dell'utente appena entra nella dashboard
    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        // Recupera l'email dal token JWT
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null) return NotFound(ErrorCodes.USER_NOT_FOUND);

        // Mappa l'utente nel DTO
        return Ok(new UserProfileDto
        {
            Email = user.Email!,
            GeneralManagerName = user.GeneralManagerName,
            FantasyTeamName = user.FantasyTeamName,
            IsSetupComplete = !string.IsNullOrEmpty(user.GeneralManagerName) &&
                              !string.IsNullOrEmpty(user.FantasyTeamName)
        });
    }
}