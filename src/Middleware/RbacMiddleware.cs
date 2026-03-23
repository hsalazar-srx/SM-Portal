#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using MovexPortal.Models;
using MovexPortal.Services;

namespace MovexPortal.Middleware;

/// <summary>
/// Implements: architecture/rbac-endpoint-control
/// Enforces role-based access control and logs all access decisions to audit trail.
/// </summary>
public sealed class RbacMiddleware
{
    private readonly RequestDelegate _next;

    public RbacMiddleware(RequestDelegate next)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
    }

    public async Task InvokeAsync(
        HttpContext context,
        IEndpointRegistryProvider registryProvider,
        IRbacService rbacService,
        IAuditService auditService)
    {
        // Skip RBAC check for auth/debug endpoints and read-only portal data endpoints.
        // Note: paths here are AFTER UsePathBase strips /api — so use /auth not /api/auth.
        if (context.Request.Path.StartsWithSegments("/auth") ||
            context.Request.Path.StartsWithSegments("/debug") ||
            context.Request.Path.StartsWithSegments("/exchange-rates") ||
            context.Request.Path.StartsWithSegments("/swagger"))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        // Resolve endpoint definition from registry
        var endpoint = await ResolveEndpointAsync(context, registryProvider).ConfigureAwait(false);
        if (endpoint is null)
        {
            await _next(context).ConfigureAwait(false);
            return;
        }
        
        var user = BuildUserContext(context.User);
        var result = await rbacService.AuthorizeAsync(user, endpoint, context.RequestAborted).ConfigureAwait(false);
        
        // Log RBAC decision (successful or denied)
        var auditEvent = new AuditEvent(
            result.Authorized ? "rbac-authorized" : "rbac-denied",
            user.Identity,
            $"{endpoint.Program}/{endpoint.Method}",
            endpoint.RiskLevel,
            DateTimeOffset.UtcNow,
            new Dictionary<string, object>
            {
                { "endpoint", endpoint.Id },
                { "matchedRole", result.MatchedRole ?? "NONE" },
                { "reason", result.Reason ?? "Unknown" },
                { "userRoles", string.Join(";", user.Roles) }
            });
        
        _ = await auditService.LogAsync(auditEvent, context.RequestAborted).ConfigureAwait(false);
        
        context.Items["EndpointDefinition"] = endpoint;
        context.Items["RbacResult"] = result;

        if (!result.Authorized)
        {
            Console.WriteLine($"[RBAC] ❌ ACCESS DENIED - User: {user.Identity}, Endpoint: {endpoint.Id}, Reason: {result.Reason}");
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = result.Reason, code = "RBAC_DENIED" }, cancellationToken: context.RequestAborted).ConfigureAwait(false);
            return;
        }

        Console.WriteLine($"[RBAC] ✅ ACCESS GRANTED - User: {user.Identity}, Endpoint: {endpoint.Id}, Role: {result.MatchedRole}");
        await _next(context).ConfigureAwait(false);
    }

    private static async Task<EndpointDefinition?> ResolveEndpointAsync(
        HttpContext context,
        IEndpointRegistryProvider registryProvider)
    {
        var registry = await registryProvider.GetCurrentAsync(context.RequestAborted).ConfigureAwait(false);

        if (context.Request.RouteValues.TryGetValue("id", out var idValue))
        {
            var id = Convert.ToString(idValue);
            return registry.Endpoints.FirstOrDefault(e => string.Equals(e.Id, id, StringComparison.OrdinalIgnoreCase));
        }

        var program = Convert.ToString(context.Request.RouteValues.GetValueOrDefault("program"));
        var method = Convert.ToString(context.Request.RouteValues.GetValueOrDefault("method"));
        if (!string.IsNullOrWhiteSpace(program) && !string.IsNullOrWhiteSpace(method))
        {
            return registry.Endpoints.FirstOrDefault(e =>
                string.Equals(e.Program, program, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(e.Method, method, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }

    private static UserContext BuildUserContext(ClaimsPrincipal principal)
    {
        var identity = principal.Identity?.Name ?? "UNKNOWN";
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var claim in principal.Claims)
        {
            if (claim.Type == ClaimTypes.Role || claim.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase))
            {
                roles.Add(claim.Value);
            }

            if (claim.Type.Equals("groups", StringComparison.OrdinalIgnoreCase))
            {
                roles.Add(claim.Value);
            }
        }

        return new UserContext(identity, roles.ToList());
    }
}
