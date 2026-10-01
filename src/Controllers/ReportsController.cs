using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovexPortal.Models;
using MovexPortal.Services;
using Polly.CircuitBreaker;

namespace MovexPortal.Controllers;

// Uses skill: architecture/dotnet-api-design v1.0

/// <summary>
/// Report catalog and download proxy — delegates to Reporting-Service via ReportApiClient.
/// Authentication: Windows AD ([Authorize]). Read-only data, so no RBAC registry entry;
/// the catalog's RequiredRole is not enforced yet (deferred, see the Reports design doc).
///
/// Routes: GET  /api/reports
///         POST /api/reports/{id}/download   → the rendered file (Excel by default)
/// </summary>
[ApiController]
[Route("reports")]
[Authorize]
public class ReportsController(
    ReportApiClient reportApiClient,
    ILogger<ReportsController> logger) : ControllerBase
{
    private static readonly Regex ReportIdRegex =
        new(@"^[a-z0-9]+(?:[.\-][a-z0-9]+)*$", RegexOptions.Compiled);

    private static readonly HashSet<string> FileFormats = new(StringComparer.OrdinalIgnoreCase) { "excel", "pdf" };

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;
        try
        {
            return Ok(await reportApiClient.ListReportsAsync(correlationId, cancellationToken));
        }
        catch (Exception ex) when (ex is HttpRequestException or BrokenCircuitException
                                   || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogError(ex, "[ReportsController] Catalog unavailable correlationId={CorrelationId}", correlationId);
            return StatusCode(502, new
            {
                error = "The report list is temporarily unavailable. Please try again shortly.",
                correlationId
            });
        }
    }

    [HttpPost("{id}/download")]
    public async Task<IActionResult> Download(
        [FromRoute] string id,
        [FromBody] ReportDownloadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!ReportIdRegex.IsMatch(id))
            return BadRequest(new { error = $"'{id}' is not a valid report id." });

        var format = string.IsNullOrWhiteSpace(request.Format) ? "excel" : request.Format.Trim().ToLowerInvariant();
        if (!FileFormats.Contains(format))
            return BadRequest(new { error = $"Format must be excel or pdf. Got: {format}" });

        var user = HttpContext.User.Identity?.Name ?? "unknown";
        var correlationId = HttpContext.TraceIdentifier;

        logger.LogInformation(
            "[ReportsController] User={User} report={ReportId} format={Format} parameters={Parameters}",
            user, id, format, string.Join(",", request.Parameters.Keys));

        try
        {
            var file = await reportApiClient.DownloadAsync(
                id, format, request.Parameters, correlationId, cancellationToken);

            if (file is null)
                return NotFound(new { error = $"Report '{id}' does not exist.", correlationId });

            return File(file.Content, file.ContentType, file.FileName);
        }
        catch (ReportRejectedException ex)
        {
            // Reporting-Service's message is written for the user (bad parameter, too many rows).
            return BadRequest(new { error = ex.Message, correlationId });
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "[ReportsController] {ReportId} timed out correlationId={CorrelationId}", id, correlationId);
            return StatusCode(504, new
            {
                error = "The report took too long to run. Try narrowing it with the filters, or try again later.",
                correlationId
            });
        }
        catch (BrokenCircuitException ex)
        {
            logger.LogError(ex, "[ReportsController] Reporting-Service circuit open correlationId={CorrelationId}", correlationId);
            return StatusCode(502, new
            {
                error = "The reporting service is temporarily unavailable. Please try again shortly.",
                correlationId
            });
        }
        catch (HttpRequestException ex)
        {
            if (ex.StatusCode.HasValue && (int)ex.StatusCode >= 400 && (int)ex.StatusCode < 500)
            {
                logger.LogError(ex,
                    "[ReportsController] Auth/Config issue with Reporting-Service correlationId={CorrelationId} StatusCode={StatusCode}",
                    correlationId, ex.StatusCode);
                return StatusCode(502, new
                {
                    error = "Reporting service configuration error. Contact support.",
                    correlationId
                });
            }

            logger.LogError(ex,
                "[ReportsController] Reporting-Service failure correlationId={CorrelationId} StatusCode={StatusCode}",
                correlationId, ex.StatusCode);
            return StatusCode(502, new
            {
                error = "The report could not be produced right now. Please try again shortly.",
                correlationId
            });
        }
    }
}
