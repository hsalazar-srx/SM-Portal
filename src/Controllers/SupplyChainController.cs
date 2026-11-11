using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovexPortal.Models;
using MovexPortal.Services;
using Polly.CircuitBreaker;

namespace MovexPortal.Controllers;

// Uses skill: architecture/dotnet-api-design v1.0
// Uses skill: architecture/audit-logging-framework v1.0

/// <summary>
/// Supply Chain Workbench proxy: a thin pass-through to Reporting-Service's Workbench API
/// (api/v1/supplychain/workbench) through <see cref="SupplyChainApiClient"/>.
///
/// Authentication: Windows AD ([Authorize]). Authorization: the person's role (buyer, planner or manager) comes
/// from their AD groups via <see cref="SupplyChainAccess"/> and config/rbac-config.json; no role, no access.
/// The role and the user's name sent to Reporting-Service are taken from the sign-in. Anything the browser
/// sends for them is ignored, because Reporting-Service trusts these two headers completely.
/// Reporting-Service decides what each role may see and change; the portal does not repeat those rules.
///
/// Routes: GET   /supply-chain/access      → { allowed, role }
///         GET   /supply-chain/rows        → a page of Workbench lines
///         GET   /supply-chain/summary     → card counts and backlog per buyer
///         GET   /supply-chain/trend       → daily figures
///         GET   /supply-chain/categories  → the Category menu
///         PATCH /supply-chain/entry       → change a line's Category, Details or Planners Notes (audited)
///
/// Reporting-Service's own explanations (400, 403, 404, 409 with who changed a field, 503 busy with Retry-After)
/// pass through, because they are written for the person. Faults (a wrong key, a 500, no connection) become a
/// sanitised 502 or 504 with a correlation id.
/// </summary>
[ApiController]
[Route("supply-chain")]
[Authorize]
public class SupplyChainController(
    SupplyChainApiClient client,
    SupplyChainAccess access,
    IAuditService audit,
    ILogger<SupplyChainController> logger) : ControllerBase
{
    private const string EntryResource = "supplychain/entry";

    /// <summary>The query parameters forwarded to each read resource. Everything else is dropped.</summary>
    private static readonly IReadOnlyDictionary<string, string[]> ForwardedQuery = new Dictionary<string, string[]>
    {
        ["rows"] =
        [
            "division", "buyer", "type", "category", "search", "okNg", "card", "sort", "descending", "includeGone",
            "refresh", "page", "pageSize",
        ],
        ["summary"] = ["division", "refresh"],
        ["trend"] = ["division", "weeks"],
        ["categories"] = [],
    };

    /// <summary>The entry fields whose names are recorded in the audit log (their values never are).</summary>
    private static readonly string[] EntryFields = ["category", "details", "plannersNotes"];

    /// <summary>Whether the person may use the Workbench, and in which role. Drives the welcome-page tile and the tabs.</summary>
    [HttpGet("access")]
    public IActionResult GetAccess()
    {
        var role = access.RoleOf(User);
        return Ok(new { allowed = role is not null, role });
    }

    [HttpGet("rows")]
    public Task<IActionResult> Rows(CancellationToken cancellationToken = default) => ReadAsync("rows", cancellationToken);

    [HttpGet("summary")]
    public Task<IActionResult> Summary(CancellationToken cancellationToken = default) => ReadAsync("summary", cancellationToken);

    [HttpGet("trend")]
    public Task<IActionResult> Trend(CancellationToken cancellationToken = default) => ReadAsync("trend", cancellationToken);

    [HttpGet("categories")]
    public Task<IActionResult> Categories(CancellationToken cancellationToken = default) => ReadAsync("categories", cancellationToken);

    [HttpPatch("entry")]
    public async Task<IActionResult> PatchEntry([FromBody] JsonElement body, CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var user = User.Identity?.Name ?? "unknown";
        var role = access.RoleOf(User);

        if (role is null)
        {
            logger.LogWarning("[SupplyChainController] Denied User={User} PATCH entry correlationId={CorrelationId}", user, correlationId);
            await AuditEditAsync("denied", user, null, body, 403, correlationId, cancellationToken);
            return Forbidden(correlationId);
        }

        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { error = "The request body must be a JSON object.", correlationId });

        var who = new SupplyChainIdentity(user, role);
        int statusCode;
        IActionResult result;
        try
        {
            var upstream = await client.PatchEntryAsync(body.GetRawText(), who, correlationId, cancellationToken);
            statusCode = ResultStatus(upstream);
            result = Map(upstream, correlationId);
        }
        catch (Exception ex) when (IsFault(ex, cancellationToken))
        {
            (statusCode, result) = Fault(ex, correlationId);
        }

        await AuditEditAsync(statusCode < 400 ? "execute" : "error", user, role, body, statusCode, correlationId, cancellationToken);
        return result;
    }

    // ── Reading ───────────────────────────────────────────────────────────────────

    private async Task<IActionResult> ReadAsync(string resource, CancellationToken cancellationToken)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var user = User.Identity?.Name ?? "unknown";
        var role = access.RoleOf(User);

        if (role is null)
        {
            logger.LogWarning("[SupplyChainController] Denied User={User} {Resource} correlationId={CorrelationId}",
                user, resource, correlationId);
            return Forbidden(correlationId);
        }

        var query = ForwardedQuery[resource]
            .SelectMany(key => Request.Query[key].Select(value => new KeyValuePair<string, string?>(key, value)))
            .ToList();

        try
        {
            var upstream = await client.GetAsync(resource, query, new SupplyChainIdentity(user, role), correlationId, cancellationToken);
            return Map(upstream, correlationId);
        }
        catch (Exception ex) when (IsFault(ex, cancellationToken))
        {
            return Fault(ex, correlationId).Result;
        }
    }

    // ── Mapping Reporting-Service's answer ────────────────────────────────────────

    /// <summary>The status the browser will be given for this upstream answer.</summary>
    private static int ResultStatus(SupplyChainResponse upstream) => PassesThrough(upstream.Status) ? (int)upstream.Status : 502;

    /// <summary>
    /// Answers Reporting-Service wrote for the person pass through; anything else (a wrong key, a server fault) is the
    /// portal's configuration or Reporting-Service's problem, not something to show.
    /// </summary>
    private static bool PassesThrough(HttpStatusCode status) =>
        (int)status is >= 200 and < 300 or 400 or 403 or 404 or 409 or 503;

    private IActionResult Map(SupplyChainResponse upstream, string correlationId)
    {
        if (!PassesThrough(upstream.Status))
        {
            logger.LogError("[SupplyChainController] Reporting-Service answered {Status} correlationId={CorrelationId}",
                (int)upstream.Status, correlationId);
            return StatusCode(502, new
            {
                error = (int)upstream.Status == 401
                    ? "The Workbench is not configured correctly. Contact support."
                    : "The Workbench is temporarily unavailable. Please try again shortly.",
                correlationId,
            });
        }

        if (upstream.Status == HttpStatusCode.ServiceUnavailable && upstream.RetryAfter is not null)
            Response.Headers["Retry-After"] = upstream.RetryAfter;

        return new ContentResult
        {
            StatusCode = (int)upstream.Status,
            Content = upstream.Body,
            ContentType = "application/json",
        };
    }

    private static bool IsFault(Exception ex, CancellationToken cancellationToken) =>
        ex is HttpRequestException or BrokenCircuitException
        || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested);

    private (int Status, IActionResult Result) Fault(Exception ex, string correlationId)
    {
        if (ex is TaskCanceledException)
        {
            logger.LogError(ex, "[SupplyChainController] Reporting-Service timed out correlationId={CorrelationId}", correlationId);
            return (504, StatusCode(504, new
            {
                error = "The Workbench took too long to answer. Please try again; narrowing the filters can help.",
                correlationId,
            }));
        }

        logger.LogError(ex, "[SupplyChainController] Reporting-Service unavailable correlationId={CorrelationId}", correlationId);
        return (502, StatusCode(502, new
        {
            error = "The Workbench is temporarily unavailable. Please try again shortly.",
            correlationId,
        }));
    }

    private IActionResult Forbidden(string correlationId) =>
        StatusCode(403, new
        {
            error = "You do not have access to the Supply Chain Workbench. Contact IT if you need it.",
            correlationId,
        });

    // ── Audit ─────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Records an edit attempt: who, which line, which fields were touched, the role and the outcome. The text typed
    /// is never logged (Reporting-Service's change history holds the values). A failing audit store is logged but
    /// does not change the answer: the edit has already happened and the person must not be told it failed.
    /// </summary>
    private async Task AuditEditAsync(
        string eventType, string user, string? role, JsonElement body, int statusCode, string correlationId, CancellationToken ct)
    {
        try
        {
            var data = new Dictionary<string, object>
            {
                ["path"] = "/supply-chain/entry",
                ["method"] = "PATCH",
                ["statusCode"] = statusCode,
                ["correlationId"] = correlationId,
                ["role"] = role ?? "none",
            };

            if (body.ValueKind == JsonValueKind.Object)
            {
                if (Text(body, "division") is { } division) data["division"] = division;
                if (Text(body, "lineKey") is { } lineKey) data["lineKey"] = lineKey;
                var fields = EntryFields.Where(f => TouchedField(body, f)).ToList();
                if (fields.Count > 0) data["fields"] = string.Join(",", fields);
            }

            await audit.LogAsync(
                new AuditEvent(eventType, user, EntryResource, RiskLevel.Medium, DateTimeOffset.UtcNow, data), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "[SupplyChainController] Audit of an edit failed correlationId={CorrelationId}", correlationId);
        }
    }

    private static bool TouchedField(JsonElement body, string name) =>
        body.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null && value.ValueKind != JsonValueKind.Undefined;

    /// <summary>A short string property, or null. Capped so a hostile value cannot flood the audit log.</summary>
    private static string? Text(JsonElement body, string name)
    {
        if (!body.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String) return null;
        var text = value.GetString();
        return text is null ? null : text.Length <= 200 ? text : text[..200];
    }
}
