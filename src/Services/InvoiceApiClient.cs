using System.Diagnostics;
using System.Net.Http.Json;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Uses skill: architecture/dotnet-api-design v1.0

/// <summary>
/// Typed HttpClient for the MyInvois.Api internal service.
/// Registered in Program.cs with Polly retry + circuit breaker.
/// Base URL and API key are injected via configuration (MyInvoisApi:BaseUrl / MyInvoisApi:ApiKey).
/// </summary>
public class InvoiceApiClient(HttpClient httpClient, ILogger<InvoiceApiClient> logger)
{
    /// <summary>
    /// Fetches invoices from GET /api/v1/invoices on MyInvois.Api.
    /// Forwards X-Correlation-Id for end-to-end log tracing across both services.
    /// </summary>
    public async Task<InvoiceListResponse?> GetInvoicesAsync(
        string fromDate,
        string toDate,
        string type,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        // Forward CorrelationId — use provided value, fall back to current Activity or new GUID
        var cid = correlationId
            ?? Activity.Current?.Id
            ?? Guid.NewGuid().ToString();

        httpClient.DefaultRequestHeaders.Remove("X-Correlation-Id");
        httpClient.DefaultRequestHeaders.Add("X-Correlation-Id", cid);

        var url = $"api/v1/invoices?fromDate={Uri.EscapeDataString(fromDate)}&toDate={Uri.EscapeDataString(toDate)}&type={Uri.EscapeDataString(type)}";
        logger.LogInformation("[InvoiceApiClient] GET {Url} correlationId={CorrelationId}", url, cid);

        var response = await httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<InvoiceListResponse>(
            cancellationToken: cancellationToken);
    }
}
