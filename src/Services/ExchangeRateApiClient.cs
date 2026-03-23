using System.Diagnostics;
using System.Net.Http.Json;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Uses skill: architecture/dotnet-api-design v1.0

/// <summary>
/// Typed HttpClient for the Reporting-Service exchange rate endpoint.
/// Registered in Program.cs with Polly retry + circuit breaker.
/// Base URL and API key are injected via configuration (ReportingApi:BaseUrl / ReportingApi:ApiKey).
///
/// Endpoint: GET /api/v1/exchange-rates/{currency}/{date}
/// Returns null when Reporting-Service responds with 404 (no rate + no fallback found).
/// </summary>
public class ExchangeRateApiClient(HttpClient httpClient, ILogger<ExchangeRateApiClient> logger)
{
    /// <summary>
    /// Fetches the SPOT rate for <paramref name="currency"/> on <paramref name="date"/>.
    /// Returns null when no rate exists within the fallback window (404 from Reporting-Service).
    /// Forwards X-Correlation-Id for end-to-end log tracing across both services.
    /// </summary>
    /// <param name="currency">ISO 4217 code, e.g. "USD".</param>
    /// <param name="date">Date in yyyy-MM-dd format.</param>
    /// <param name="correlationId">Propagated CorrelationId from the inbound SM-Portal request.</param>
    /// <param name="ct">Cancellation token.</param>
    public async Task<ExchangeRateResponse?> GetRateAsync(
        string currency,
        string date,
        string? correlationId = null,
        CancellationToken ct = default)
    {
        var cid = correlationId
            ?? Activity.Current?.Id
            ?? Guid.NewGuid().ToString();

        httpClient.DefaultRequestHeaders.Remove("X-Correlation-Id");
        httpClient.DefaultRequestHeaders.Add("X-Correlation-Id", cid);

        var url = $"api/v1/exchange-rates/{Uri.EscapeDataString(currency)}/{Uri.EscapeDataString(date)}";
        logger.LogInformation(
            "[ExchangeRateApiClient] GET {Url} correlationId={CorrelationId}", url, cid);

        var response = await httpClient.GetAsync(url, ct);

        // 404 = no rate found within fallback window — return null (caller decides HTTP response)
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            logger.LogWarning(
                "[ExchangeRateApiClient] No rate found for {Currency}/{Date} cid={Cid}",
                currency, date, cid);
            return null;
        }

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ExchangeRateResponse>(
            cancellationToken: ct);
    }
}
