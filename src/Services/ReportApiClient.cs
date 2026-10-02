using System.Diagnostics;
using System.Net.Http.Json;
using MovexPortal.Models;

namespace MovexPortal.Services;

/// <summary>
/// Typed HttpClient for the Reporting-Service report catalog and execution endpoints.
/// Registered in Program.cs with a long timeout and a circuit breaker but no retry —
/// see the registration for why. Base URL and API key: ReportingApi:BaseUrl / ReportingApi:ApiKey.
///
/// Endpoints: GET  /api/v1/reports
///            POST /api/v1/reports/{id}/execute
///
/// The execute response is a binary workbook: it is read as bytes and passed through,
/// never deserialised.
/// </summary>
public class ReportApiClient(HttpClient httpClient, ILogger<ReportApiClient> logger)
{
    public async Task<IReadOnlyList<ReportDefinitionDto>> ListReportsAsync(
        string? correlationId = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "api/v1/reports");
        request.Headers.Add("X-Correlation-Id", correlationId ?? NewCorrelationId());

        using var response = await httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<ReportDefinitionDto>>(cancellationToken: ct) ?? [];
    }

    /// <summary>
    /// Executes a report and returns the rendered file.
    /// Returns null when the report is not in the catalog (404).
    /// Throws <see cref="ReportRejectedException"/> with Reporting-Service's own message when it
    /// rejects the request (400) — invalid parameters, unsupported format, or a result over the
    /// row limit. Throws <see cref="HttpRequestException"/> for anything else unsuccessful.
    /// </summary>
    public async Task<ReportFile?> DownloadAsync(
        string reportId,
        string format,
        Dictionary<string, string?> parameters,
        string? correlationId = null,
        CancellationToken ct = default)
    {
        var cid = correlationId ?? NewCorrelationId();
        var url = $"api/v1/reports/{Uri.EscapeDataString(reportId)}/execute";

        // Blank values are dropped so the Reporting-Service applies its own defaults.
        var body = new
        {
            format,
            parameters = parameters
                .Where(p => !string.IsNullOrWhiteSpace(p.Value))
                .ToDictionary(p => p.Key, p => p.Value!.Trim())
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-Correlation-Id", cid);

        logger.LogInformation("[ReportApiClient] POST {Url} format={Format} correlationId={CorrelationId}",
            url, format, cid);

        using var response = await httpClient.SendAsync(request, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;

        if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
        {
            var error = await TryReadErrorAsync(response, ct);
            logger.LogWarning("[ReportApiClient] {ReportId} rejected: {Code} cid={Cid}", reportId, error?.Code, cid);
            throw new ReportRejectedException(error?.Message ?? "The report request was rejected.");
        }

        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsByteArrayAsync(ct);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";

        return new ReportFile(content, contentType, FileNameFrom(response, reportId, format));
    }

    private static string FileNameFrom(HttpResponseMessage response, string reportId, string format)
    {
        var disposition = response.Content.Headers.ContentDisposition;
        var name = (disposition?.FileNameStar ?? disposition?.FileName)?.Trim('"');

        // Path.GetFileName drops any directory part a malformed header might carry.
        name = string.IsNullOrWhiteSpace(name) ? null : Path.GetFileName(name);

        var extension = format == "pdf" ? "pdf" : "xlsx";
        return name ?? $"{reportId}-{DateTime.Now:yyyy-MM-dd}.{extension}";
    }

    private static async Task<UpstreamError?> TryReadErrorAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            return await response.Content.ReadFromJsonAsync<UpstreamError>(cancellationToken: ct);
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }
    }

    private static string NewCorrelationId() => Activity.Current?.Id ?? Guid.NewGuid().ToString();

    /// <summary>Reporting-Service ErrorResponse shape.</summary>
    private sealed record UpstreamError(string? Code, string? Message);
}

/// <summary>
/// Reporting-Service refused the request (HTTP 400). The message is written for the user —
/// e.g. which parameter is invalid, or that the result is too large and how to narrow it.
/// </summary>
public sealed class ReportRejectedException(string message) : Exception(message);
