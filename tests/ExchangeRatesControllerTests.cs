using System;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Controllers;
using MovexPortal.Services;
using Polly.CircuitBreaker;
using Xunit;
using static MovexPortal.Tests.ReportApiClientTests;

namespace MovexPortal.Tests;

/// <summary>
/// ExchangeRatesController must turn every Reporting-Service failure into a sanitised JSON error —
/// including the Polly circuit breaker being open and timeouts, which are not HttpRequestException
/// and previously escaped as unhandled 500s.
/// </summary>
public class ExchangeRatesControllerTests
{
    private static ExchangeRatesController CreateController(FakeHandler handler) =>
        new(new ExchangeRateApiClient(
                new HttpClient(handler) { BaseAddress = new Uri("http://reporting.test/") },
                NullLogger<ExchangeRateApiClient>.Instance),
            NullLogger<ExchangeRatesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "SRX\\tester")], "Test"))
                }
            }
        };

    [Fact]
    public async Task GetRate_CircuitOpen_Returns502InsteadOfThrowing()
    {
        var controller = CreateController(new FakeHandler(_ =>
            throw new BrokenCircuitException("The circuit is now open and is not allowing calls.")));

        var result = await controller.GetRate("USD", "2026-10-06", CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(502, error.StatusCode);
        Assert.DoesNotContain("circuit", ErrorText(error), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetRate_UpstreamTimeout_Returns504InsteadOfThrowing()
    {
        // HttpClient.Timeout surfaces as TaskCanceledException while the caller's token is not cancelled.
        var controller = CreateController(new FakeHandler(_ => throw new TaskCanceledException("timed out")));

        var result = await controller.GetRate("USD", "2026-10-06", CancellationToken.None);

        Assert.Equal(504, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task GetRate_CallerCancelled_PropagatesCancellation()
    {
        // A browser that navigated away is not an upstream failure — let ASP.NET Core handle it.
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var controller = CreateController(new FakeHandler(_ => throw new TaskCanceledException("cancelled")));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => controller.GetRate("USD", "2026-10-06", cts.Token));
    }

    [Fact]
    public async Task GetRate_UpstreamDown_StillReturns502()
    {
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.ServiceUnavailable, "{}")));

        var result = await controller.GetRate("USD", "2026-10-06", CancellationToken.None);

        Assert.Equal(502, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    private static string ErrorText(ObjectResult result) =>
        result.Value?.GetType().GetProperty("error")?.GetValue(result.Value)?.ToString() ?? string.Empty;
}
