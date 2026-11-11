using System.Diagnostics;
using System.Net;
using System.Text;

namespace MovexPortal.Services;

/// <summary>Who is asking, as Reporting-Service needs to know: the signed-in user and the role resolved from their AD groups.</summary>
public sealed record SupplyChainIdentity(string User, string Role);

/// <summary>Reporting-Service's answer, untouched: status, JSON body, and Retry-After if it sent one.</summary>
public sealed record SupplyChainResponse(HttpStatusCode Status, string Body, string? RetryAfter);

/// <summary>
/// Typed HttpClient for Reporting-Service's Workbench API (api/v1/supplychain/workbench). Same base URL and API key
/// as the report client; registered in Program.cs with a circuit breaker and no retry.
///
/// A thin pipe by design: the Workbench's shapes (rows, summary, trend, entry) belong to Reporting-Service and
/// change with it, so the portal does not copy them. It adds who is asking (X-SC-User, X-SC-Role: from the
/// sign-in, never from the browser), reaches only the resources below, and returns the status and body as they
/// came so the controller can decide what the browser sees. Network faults throw (HttpRequestException,
/// BrokenCircuitException, TaskCanceledException).
/// </summary>
public class SupplyChainApiClient(HttpClient httpClient, ILogger<SupplyChainApiClient> logger)
{
    private const string Base = "api/v1/supplychain/workbench";

    /// <summary>The read resources a browser may reach. The sync endpoint is deliberately not among them.</summary>
    public static readonly IReadOnlySet<string> ReadResources =
        new HashSet<string>(StringComparer.Ordinal) { "rows", "summary", "trend", "categories" };

    public async Task<SupplyChainResponse> GetAsync(
        string resource,
        IEnumerable<KeyValuePair<string, string?>> query,
        SupplyChainIdentity who,
        string? correlationId = null,
        CancellationToken ct = default)
    {
        if (!ReadResources.Contains(resource))
            throw new ArgumentException($"'{resource}' is not a Workbench read resource.", nameof(resource));

        var parts = query
            .Where(p => !string.IsNullOrWhiteSpace(p.Value))
            .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value!.Trim())}");
        var queryString = string.Join("&", parts);
        var url = queryString.Length == 0 ? $"{Base}/{resource}" : $"{Base}/{resource}?{queryString}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        return await SendAsync(request, who, correlationId, ct).ConfigureAwait(false);
    }

    /// <summary>Sends an edit. <paramref name="jsonBody"/> goes through exactly as the browser sent it.</summary>
    public async Task<SupplyChainResponse> PatchEntryAsync(
        string jsonBody, SupplyChainIdentity who, string? correlationId = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"{Base}/entry")
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, "application/json"),
        };
        return await SendAsync(request, who, correlationId, ct).ConfigureAwait(false);
    }

    private async Task<SupplyChainResponse> SendAsync(
        HttpRequestMessage request, SupplyChainIdentity who, string? correlationId, CancellationToken ct)
    {
        var cid = correlationId ?? Activity.Current?.Id ?? Guid.NewGuid().ToString();
        request.Headers.Add("X-SC-User", who.User);
        request.Headers.Add("X-SC-Role", who.Role);
        request.Headers.Add("X-Correlation-Id", cid);

        logger.LogInformation("[SupplyChainApiClient] {Method} {Url} role={Role} correlationId={CorrelationId}",
            request.Method, request.RequestUri, who.Role, cid);

        using var response = await httpClient.SendAsync(request, ct).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        var retryAfter = response.Headers.RetryAfter?.Delta is { } delta
            ? ((int)Math.Ceiling(delta.TotalSeconds)).ToString(System.Globalization.CultureInfo.InvariantCulture)
            : null;
        return new SupplyChainResponse(response.StatusCode, body, retryAfter);
    }
}
