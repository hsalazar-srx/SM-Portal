using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Controllers;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;
using static MovexPortal.Tests.ReportApiClientTests;

namespace MovexPortal.Tests;

/// <summary>
/// ReportsController: only reports the user's AD groups allow are listed or run, and
/// Reporting-Service outcomes map to what the browser should see — the file, the upstream's
/// explanation when it rejects a request, or a sanitised 502 when it is down.
/// </summary>
public class ReportsControllerTests
{
    private const string FinanceSid = "S-1-5-21-100-200-300-1111";

    private const string CatalogJson = """
        [{ "id": "inventory.item-list", "displayName": "Inventory List", "requiredRole": "Reporting_Read" },
         { "id": "hr.headcount",        "displayName": "Headcount",      "requiredRole": "HR_Read" }]
        """;

    private static ReportAccess NewAccess() => new(new Dictionary<string, IReadOnlyCollection<string>>
    {
        ["Reporting_Read"] = [FinanceSid]
    });

    // Shared by most tests. ReportAccess remembers which missing roles it has already reported, so a test
    // that asserts on that warning builds its own instance rather than relying on this one's history.
    private static readonly ReportAccess Access = NewAccess();

    private static ClaimsPrincipal FinanceUser() => ReportAccessTests.User((ClaimTypes.GroupSid, FinanceSid));
    private static ClaimsPrincipal OtherUser() => ReportAccessTests.User((ClaimTypes.GroupSid, "S-1-5-21-100-200-300-5555"));

    private static ReportsController CreateController(
        RoutingHandler handler, ClaimsPrincipal? user = null, ILogger<ReportsController>? logger = null,
        ReportAccess? access = null) =>
        new(CreateClient(handler), access ?? Access, logger ?? NullLogger<ReportsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user ?? FinanceUser() }
            }
        };

    private static ReportDownloadRequest Excel() => new() { Format = "excel" };

    // ── Access ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Access_UserWhoCanRunACatalogReport_IsAllowed()
    {
        var result = await CreateController(new RoutingHandler(), FinanceUser()).GetAccess(CancellationToken.None);

        Assert.True(Allowed(result));
    }

    [Fact]
    public async Task Access_UserWhoCanRunNoCatalogReport_IsNotAllowed()
    {
        var result = await CreateController(new RoutingHandler(), OtherUser()).GetAccess(CancellationToken.None);

        Assert.False(Allowed(result));
    }

    [Fact]
    public async Task List_ReportRequiringAnUnconfiguredRole_IsHidden_AndWarnedAboutOnce()
    {
        // CatalogJson's Headcount report needs HR_Read, which the test config does not define — the
        // same silent "nobody can see it" a typo'd or not-yet-deployed role would cause in production.
        var logger = new CapturingLogger<ReportsController>();
        var controller = CreateController(new RoutingHandler(), FinanceUser(), logger, NewAccess());

        var first = await controller.List(CancellationToken.None);
        await controller.List(CancellationToken.None);
        await controller.GetAccess(CancellationToken.None);

        var ids = Assert.IsAssignableFrom<IEnumerable<ReportDefinitionDto>>(Assert.IsType<OkObjectResult>(first).Value)
            .Select(r => r.Id);
        Assert.DoesNotContain("hr.headcount", ids);
        var warning = Assert.Single(logger.Warnings);
        Assert.Contains("HR_Read", warning);
        Assert.Contains("hr.headcount", warning);
    }

    [Fact]
    public async Task Access_RoleThatNoReportRequires_DoesNotEnableReports()
    {
        // rbac-config.json also holds M3 roles; holding one of those must not light up Reports.
        var handler = new RoutingHandler(catalog: () => Json(HttpStatusCode.OK,
            """[{ "id": "hr.headcount", "displayName": "Headcount", "requiredRole": "HR_Read" }]"""));

        var result = await CreateController(handler, FinanceUser()).GetAccess(CancellationToken.None);

        Assert.False(Allowed(result));
    }

    [Fact]
    public async Task Access_CatalogUnavailable_IsNotAllowed()
    {
        var handler = new RoutingHandler(catalog: () => Json(HttpStatusCode.ServiceUnavailable, "{}"));

        var result = await CreateController(handler, FinanceUser()).GetAccess(CancellationToken.None);

        Assert.False(Allowed(result));
    }

    // ── List ──────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task List_ReturnsOnlyReportsTheUsersRolesAllow()
    {
        var controller = CreateController(new RoutingHandler(), FinanceUser());

        var result = await controller.List(CancellationToken.None);

        Assert.Equal(new[] { "inventory.item-list" }, Ids(result));
    }

    [Fact]
    public async Task List_UserWithNoRoles_GetsAnEmptyList()
    {
        var controller = CreateController(new RoutingHandler(), OtherUser());

        var result = await controller.List(CancellationToken.None);

        Assert.Empty(Ids(result));
    }

    [Fact]
    public async Task List_UpstreamDown_Returns502()
    {
        var handler = new RoutingHandler(catalog: () => Json(HttpStatusCode.ServiceUnavailable, "{}"));

        var result = await CreateController(handler).List(CancellationToken.None);

        Assert.Equal(502, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    // ── Download ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Download_Allowed_ReturnsFileWithUpstreamName()
    {
        var handler = new RoutingHandler(execute: () => File([1, 2, 3], "inventory.item-list-2026-10-01.xlsx"));

        var result = await CreateController(handler).Download("inventory.item-list", Excel(), CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal(new byte[] { 1, 2, 3 }, file.FileContents);
        Assert.Equal("inventory.item-list-2026-10-01.xlsx", file.FileDownloadName);
    }

    [Fact]
    public async Task Download_WithoutTheReportsRole_Returns403AndNeverRunsTheReport()
    {
        var handler = new RoutingHandler();

        var result = await CreateController(handler, OtherUser())
            .Download("inventory.item-list", Excel(), CancellationToken.None);

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.DoesNotContain(handler.Requests, r => r.Method == HttpMethod.Post);
    }

    [Fact]
    public async Task Download_ReportForAnotherRole_Returns403()
    {
        var handler = new RoutingHandler();

        var result = await CreateController(handler, FinanceUser())
            .Download("hr.headcount", Excel(), CancellationToken.None);

        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.DoesNotContain(handler.Requests, r => r.Method == HttpMethod.Post);
    }

    [Fact]
    public async Task Download_ReportNotInCatalog_Returns404WithoutRunningAnything()
    {
        var handler = new RoutingHandler();

        var result = await CreateController(handler).Download("nope", Excel(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
        Assert.DoesNotContain(handler.Requests, r => r.Method == HttpMethod.Post);
    }

    [Fact]
    public async Task Download_UpstreamRejects_Returns400WithItsMessage()
    {
        var handler = new RoutingHandler(execute: () => Json(HttpStatusCode.BadRequest,
            """{ "code": "PARAMETER_VALIDATION_FAILED", "message": "Parameter 'companyCode' value '400' is not allowed." }"""));

        var result = await CreateController(handler).Download("inventory.item-list", Excel(), CancellationToken.None);

        Assert.Contains("companyCode", ErrorText(Assert.IsType<BadRequestObjectResult>(result)));
    }

    [Fact]
    public async Task Download_UpstreamDown_Returns502WithoutLeakingUpstreamDetail()
    {
        var handler = new RoutingHandler(execute: () => Json(HttpStatusCode.ServiceUnavailable,
            """{ "code": "DATA_SOURCE_UNAVAILABLE", "message": "ODBC SQL0204 MVXC300.MITMAS not found" }"""));

        var result = await CreateController(handler).Download("inventory.item-list", Excel(), CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(502, error.StatusCode);
        Assert.DoesNotContain("ODBC", ErrorText(error));
    }

    [Fact]
    public async Task Download_CatalogUnavailable_Returns502()
    {
        var handler = new RoutingHandler(catalog: () => Json(HttpStatusCode.ServiceUnavailable, "{}"));

        var result = await CreateController(handler).Download("inventory.item-list", Excel(), CancellationToken.None);

        Assert.Equal(502, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Theory]
    [InlineData("../exchange-rates")]
    [InlineData("inventory item list")]
    public async Task Download_MalformedReportId_Returns400WithoutCallingUpstream(string id)
    {
        var handler = new RoutingHandler();

        var result = await CreateController(handler).Download(id, Excel(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(handler.Requests);
    }

    [Theory]
    [InlineData("json")]
    [InlineData("csv")]
    public async Task Download_NonFileFormat_Returns400WithoutCallingUpstream(string format)
    {
        var handler = new RoutingHandler();

        var result = await CreateController(handler).Download(
            "inventory.item-list", new ReportDownloadRequest { Format = format }, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(handler.Requests);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private static bool Allowed(IActionResult result)
    {
        var value = Assert.IsType<OkObjectResult>(result).Value!;
        return (bool)value.GetType().GetProperty("allowed")!.GetValue(value)!;
    }

    private static IEnumerable<string> Ids(IActionResult result) =>
        Assert.IsAssignableFrom<IEnumerable<ReportDefinitionDto>>(Assert.IsType<OkObjectResult>(result).Value)
            .Select(r => r.Id);

    private static string ErrorText(ObjectResult result) =>
        result.Value?.GetType().GetProperty("error")?.GetValue(result.Value)?.ToString() ?? string.Empty;

    /// <summary>Keeps the formatted text of every warning, so a test can assert what was logged.</summary>
    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Warnings { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Warning) Warnings.Add(formatter(state, exception));
        }
    }

    /// <summary>Fake Reporting-Service: GET = catalog, POST = execute. Records every request.</summary>
    private sealed class RoutingHandler(
        Func<HttpResponseMessage>? catalog = null,
        Func<HttpResponseMessage>? execute = null) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add(request);
            var response = request.Method == HttpMethod.Get
                ? (catalog ?? (() => Json(HttpStatusCode.OK, CatalogJson)))()
                : (execute ?? (() => File([1], "x.xlsx")))();
            return Task.FromResult(response);
        }
    }
}
