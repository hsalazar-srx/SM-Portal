#nullable enable

using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;

namespace MovexPortal.Controllers;

/// <summary>
/// Authentication endpoint for verifying Windows AD credentials and user roles.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    /// <summary>
    /// Test AD authentication and return user identity with claims.
    /// Requires [Authorize] attribute to trigger Windows Auth challenge.
    /// </summary>
    [HttpGet("test")]
    [Authorize]
    public IActionResult Test()
    {
        var user = HttpContext.User;
        var identity = user.Identity?.Name ?? "UNKNOWN";
        var isAuthenticated = user.Identity?.IsAuthenticated ?? false;
        var authType = user.Identity?.AuthenticationType ?? "UNKNOWN";
        
        var claims = user.Claims
            .Select(c => new { Type = c.Type, Value = c.Value })
            .ToList();
        
        // Log authentication success
        Console.WriteLine($"\n[AUTH] ===== AD AUTHENTICATION SUCCESS =====");
        Console.WriteLine($"[AUTH] User: {identity}");
        Console.WriteLine($"[AUTH] Auth Type: {authType}");
        Console.WriteLine($"[AUTH] Is Authenticated: {isAuthenticated}");
        Console.WriteLine($"[AUTH] Claims Count: {claims.Count}");
        foreach (var claim in claims)
        {
            Console.WriteLine($"[AUTH] Claim: {claim.Type} = {claim.Value}");
        }
        Console.WriteLine($"[AUTH] ===== AUTH SUCCESS END =====");
        
        return Ok(new
        {
            authenticated = isAuthenticated,
            identity,
            claims,
            authType
        });
    }

    /// <summary>
    /// Diagnostic endpoint to check authentication schemes and current user state.
    /// Does NOT require authentication.
    /// </summary>
    [HttpGet("diagnostic")]
    [AllowAnonymous]
    public IActionResult Diagnostic()
    {
        var user = HttpContext.User;
        var identity = user.Identity;
        
        Console.WriteLine($"\n[AUTH-DIAGNOSTIC] User identity type: {identity?.GetType().Name}");
        Console.WriteLine($"[AUTH-DIAGNOSTIC] User identity name: {identity?.Name}");
        Console.WriteLine($"[AUTH-DIAGNOSTIC] Is authenticated: {identity?.IsAuthenticated}");
        Console.WriteLine($"[AUTH-DIAGNOSTIC] Auth type: {identity?.AuthenticationType}");
        Console.WriteLine($"[AUTH-DIAGNOSTIC] Claims count: {user.Claims.Count()}");

        return Ok(new
        {
            identityType = identity?.GetType().Name,
            identityName = identity?.Name,
            isAuthenticated = identity?.IsAuthenticated,
            authType = identity?.AuthenticationType,
            claimCount = user.Claims.Count(),
            message = "Check console output for diagnostic info"
        });
    }
}
