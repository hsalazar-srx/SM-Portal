using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovexPortal.Services;

namespace MovexPortal.Controllers;

// Uses skill: architecture/dotnet-api-design v1.0

/// <summary>
/// Exchange rate proxy endpoint — delegates to Reporting-Service via ExchangeRateApiClient.
/// Authentication: Windows AD ([Authorize]). No RBAC registry entry needed for read-only data.
///
/// Route:  GET /api/exchange-rates/{currency}/{date}
/// Example: GET /api/exchange-rates/USD/2026-03-19
///
/// Rate convention: 1 AUD = {rate} {currency}  (e.g. 1 AUD = 0.7114 USD — RBA "A$1=USD").
/// Weekend handling: Reporting-Service returns the most recent prior-weekday rate with
///                   usedFallback=true when querying Saturday, Sunday, or public holidays.
/// </summary>
[ApiController]
[Route("exchange-rates")]
[Authorize]
public class ExchangeRatesController(
    ExchangeRateApiClient exchangeRateApiClient,
    ILogger<ExchangeRatesController> logger) : ControllerBase
{
    private static readonly Regex CurrencyRegex = new(@"^[A-Z]{3}$", RegexOptions.Compiled);

    [HttpGet("{currency}/{date}")]
    public async Task<IActionResult> GetRate(
        [FromRoute] string currency,
        [FromRoute] string date,
        CancellationToken cancellationToken = default)
    {
        currency = currency.ToUpperInvariant().Trim();

        if (!CurrencyRegex.IsMatch(currency))
            return BadRequest(new
            {
                error = $"Currency must be 3 uppercase letters (e.g. USD). Got: {currency}"
            });

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            return BadRequest(new
            {
                error = $"Date must be in yyyy-MM-dd format (e.g. 2026-03-19). Got: {date}"
            });

        var user          = HttpContext.User.Identity?.Name ?? "unknown";
        var correlationId = HttpContext.TraceIdentifier;

        logger.LogInformation(
            "[ExchangeRatesController] User={User} currency={Currency} date={Date}",
            user, currency, date);

        try
        {
            var result = await exchangeRateApiClient.GetRateAsync(
                currency, date, correlationId, cancellationToken);

            if (result is null)
                return NotFound(new
                {
                    error         = $"No rate available for {currency} on {date} — no data within 3 business days.",
                    correlationId = correlationId
                });

            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            if (ex.StatusCode.HasValue)
            {
                if ((int)ex.StatusCode >= 400 && (int)ex.StatusCode < 500)
                {
                    logger.LogError(ex,
                        "[ExchangeRatesController] Auth/Config issue with Reporting-Service correlationId={CorrelationId} StatusCode={StatusCode}",
                        correlationId, ex.StatusCode);
                    return StatusCode(502, new
                    {
                        error         = "Exchange rate service configuration error. Contact support.",
                        correlationId = correlationId
                    });
                }
                else if ((int)ex.StatusCode >= 500)
                {
                    logger.LogError(ex,
                        "[ExchangeRatesController] Reporting-Service error correlationId={CorrelationId} StatusCode={StatusCode}",
                        correlationId, ex.StatusCode);
                    return StatusCode(502, new
                    {
                        error         = "Exchange rate service encountered an error. Please try again shortly.",
                        correlationId = correlationId
                    });
                }
            }

            logger.LogError(ex,
                "[ExchangeRatesController] Reporting-Service connectivity failure correlationId={CorrelationId}",
                correlationId);
            return StatusCode(502, new
            {
                error         = "Exchange rate service is temporarily unavailable. Please try again shortly.",
                correlationId = correlationId
            });
        }
    }
}
