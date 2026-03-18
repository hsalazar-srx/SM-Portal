using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovexPortal.Models;
using MovexPortal.Services;

namespace MovexPortal.Controllers;

// Uses skill: architecture/dotnet-api-design v1.0

/// <summary>
/// Invoice extract proxy endpoint — delegates to MyInvois.Api via InvoiceApiClient.
/// Authentication: Windows AD ([Authorize]). No RBAC registry entry needed for read-only data.
/// Route: GET /api/invoices?fromDate=yyyy-MM-dd&amp;toDate=yyyy-MM-dd&amp;type=AP|AR|ALL
/// </summary>
[ApiController]
[Route("invoices")]
[Authorize]
public class InvoicesController(
    InvoiceApiClient invoiceApiClient,
    ILogger<InvoicesController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string type = "ALL",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fromDate))
            return BadRequest(new { error = "fromDate is required (yyyy-MM-dd)." });
        if (string.IsNullOrWhiteSpace(toDate))
            return BadRequest(new { error = "toDate is required (yyyy-MM-dd)." });

        var typeUpper = type.ToUpperInvariant();
        if (typeUpper is not ("ALL" or "AP" or "AR"))
            return BadRequest(new { error = "type must be AP, AR, or ALL." });

        var user          = HttpContext.User.Identity?.Name ?? "unknown";
        var correlationId = HttpContext.TraceIdentifier;

        logger.LogInformation(
            "[InvoicesController] User={User} from={FromDate} to={ToDate} type={Type}",
            user, fromDate, toDate, typeUpper);

        InvoiceListResponse? result;
        try
        {
            result = await invoiceApiClient.GetInvoicesAsync(
                fromDate, toDate, typeUpper, correlationId, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex,
                "[InvoicesController] MyInvois.Api unreachable correlationId={CorrelationId}",
                correlationId);
            return StatusCode(502, new
            {
                error         = "Invoice service is temporarily unavailable. Please try again shortly.",
                correlationId = correlationId
            });
        }

        return Ok(result);
    }
}
