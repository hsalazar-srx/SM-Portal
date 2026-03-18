#nullable enable

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovexPortal.Models;
using MovexPortal.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MovexPortal.Controllers;

/// <summary>
/// Generic endpoint executor for M3 MOVEX transactions.
/// Uses skill: architecture/generic-endpoint-executor
/// Routes:
/// - POST /api/endpoints/{id} - Execute by endpoint ID
/// - POST /api/endpoints/{program}/{method} - Execute by program/method
/// - GET /api/endpoints - List all endpoints
/// - GET /api/endpoints/{id} - Get endpoint definition
/// </summary>
[ApiController]
[Route("endpoints")]
[Authorize]
public class EndpointController : ControllerBase
{
    private readonly IGenericEndpointExecutor _executor;
    private readonly IEndpointRegistryProvider _registry;

    public EndpointController(
        IGenericEndpointExecutor executor,
        IEndpointRegistryProvider registry)
    {
        _executor = executor ?? throw new ArgumentNullException(nameof(executor));
        _registry = registry ?? throw new ArgumentNullException(nameof(registry));
    }

    /// <summary>
    /// Execute endpoint by ID.
    /// Route: POST /api/endpoints/{id}
    /// Example: POST /api/endpoints/mms175-update
    /// </summary>
    [HttpPost("{id}")]
    public async Task<IActionResult> ExecuteById(
        [FromRoute] string id,
        [FromBody] Dictionary<string, object> parameters)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { error = "Endpoint ID is required" });
        }

        if (parameters is null)
        {
            return BadRequest(new { error = "Request body with parameters is required" });
        }

        Console.WriteLine($"[ENDPOINT] ExecuteById - ID: {id}");

        // Get endpoint definition from registry
        var registry = await _registry.GetCurrentAsync(HttpContext.RequestAborted);
        var endpoint = registry.Endpoints.FirstOrDefault(e =>
            string.Equals(e.Id, id, StringComparison.OrdinalIgnoreCase));

        if (endpoint is null)
        {
            return NotFound(new { error = $"Endpoint '{id}' not found" });
        }

        // Check RBAC result from middleware
        var rbacResult = HttpContext.Items["RbacResult"] as RbacResult;
        if (rbacResult?.Authorized != true)
        {
            return Forbid();
        }

        // Build user context from claims
        var user = BuildUserContext(HttpContext.User);

        // Execute endpoint
        var result = await _executor.ExecuteAsync(endpoint, parameters, user, HttpContext.RequestAborted);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    /// <summary>
    /// Execute endpoint by Program/Method.
    /// Route: POST /api/endpoints/{program}/{method}
    /// Example: POST /api/endpoints/MMS175MI/Update
    /// </summary>
    [HttpPost("{program}/{method}")]
    public async Task<IActionResult> ExecuteByProgramMethod(
        [FromRoute] string program,
        [FromRoute] string method,
        [FromBody] Dictionary<string, object> parameters)
    {
        if (string.IsNullOrWhiteSpace(program) || string.IsNullOrWhiteSpace(method))
        {
            return BadRequest(new { error = "Program and method are required" });
        }

        if (parameters is null)
        {
            return BadRequest(new { error = "Request body with parameters is required" });
        }

        Console.WriteLine($"[ENDPOINT] ExecuteByProgramMethod - Program: {program}, Method: {method}");

        // Get endpoint definition from registry
        var registry = await _registry.GetCurrentAsync(HttpContext.RequestAborted);
        var endpoint = registry.Endpoints.FirstOrDefault(e =>
            string.Equals(e.Program, program, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(e.Method, method, StringComparison.OrdinalIgnoreCase));

        if (endpoint is null)
        {
            return NotFound(new { error = $"Endpoint '{program}/{method}' not found" });
        }

        // Check RBAC result from middleware
        var rbacResult = HttpContext.Items["RbacResult"] as RbacResult;
        if (rbacResult?.Authorized != true)
        {
            return Forbid();
        }

        // Build user context from claims
        var user = BuildUserContext(HttpContext.User);

        // Execute endpoint
        var result = await _executor.ExecuteAsync(endpoint, parameters, user, HttpContext.RequestAborted);

        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    /// <summary>
    /// Get endpoint definition by ID.
    /// Route: GET /api/endpoints/{id}
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEndpointDefinition([FromRoute] string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { error = "Endpoint ID is required" });
        }

        var registry = await _registry.GetCurrentAsync(HttpContext.RequestAborted);
        var endpoint = registry.Endpoints.FirstOrDefault(e =>
            string.Equals(e.Id, id, StringComparison.OrdinalIgnoreCase));

        if (endpoint is null)
        {
            return NotFound(new { error = $"Endpoint '{id}' not found" });
        }

        return Ok(endpoint);
    }

    /// <summary>
    /// List all available endpoints.
    /// Route: GET /api/endpoints
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> ListEndpoints()
    {
        var registry = await _registry.GetCurrentAsync(HttpContext.RequestAborted);
        return Ok(new
        {
            count = registry.Endpoints.Count,
            endpoints = registry.Endpoints.Select(e => new
            {
                e.Id,
                e.Program,
                e.Method,
                e.DisplayName,
                e.RequiredRole,
                e.RiskLevel,
                fieldCount = e.Fields.Count
            }).ToList()
        });
    }

    /// <summary>
    /// Helper to build user context from claims.
    /// </summary>
    private static UserContext BuildUserContext(System.Security.Claims.ClaimsPrincipal principal)
    {
        var identity = principal.Identity?.Name ?? "UNKNOWN";
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var claim in principal.Claims)
        {
            if (claim.Type == System.Security.Claims.ClaimTypes.Role ||
                claim.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase))
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
