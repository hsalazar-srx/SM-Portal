using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Controllers;
using MovexPortal.Models;
using Xunit;
using static MovexPortal.Tests.ReportApiClientTests;

namespace MovexPortal.Tests;

/// <summary>
/// ReportsController maps Reporting-Service outcomes to what the browser should see:
/// the file itself, the upstream's explanation when it rejects a request, or a sanitised
/// 502 when it is down — never a raw upstream error.
/// </summary>
public class ReportsControllerTests
{
    private static ReportsController CreateController(FakeHandler handler) =>
        new(CreateClient(handler), NullLogger<ReportsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "SRX\\tester")], "Test"))
                }
            }
        };

    private static ReportDownloadRequest Excel() => new() { Format = "excel" };

    [Fact]
    public async Task List_ReturnsWholeCatalog()
    {
        // The catalog is the single source of truth for what is offered — no portal-side filtering.
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.OK, """
            [{ "id": "inventory.item-list", "displayName": "Inventory List" },
             { "id": "future.new-report", "displayName": "New" }]
            """)));

        var result = await controller.List(CancellationToken.None);

        var reports = Assert.IsAssignableFrom<IEnumerable<ReportDefinitionDto>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(new[] { "inventory.item-list", "future.new-report" }, reports.Select(r => r.Id));
    }

    [Fact]
    public async Task List_UpstreamDown_Returns502()
    {
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.ServiceUnavailable, "{}")));

        var result = await controller.List(CancellationToken.None);

        Assert.Equal(502, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task Download_Success_ReturnsFileWithUpstreamName()
    {
        var controller = CreateController(new FakeHandler(_ => File([1, 2, 3], "inventory.item-list-2026-10-01.xlsx")));

        var result = await controller.Download("inventory.item-list", Excel(), CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal(new byte[] { 1, 2, 3 }, file.FileContents);
        Assert.Equal("inventory.item-list-2026-10-01.xlsx", file.FileDownloadName);
    }

    [Fact]
    public async Task Download_UpstreamRejects_Returns400WithItsMessage()
    {
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.BadRequest,
            """{ "code": "PARAMETER_VALIDATION_FAILED", "message": "Parameter 'companyCode' value '400' is not allowed." }""")));

        var result = await controller.Download("inventory.item-list", Excel(), CancellationToken.None);

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("companyCode", ErrorText(bad));
    }

    [Fact]
    public async Task Download_UnknownReport_Returns404()
    {
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.NotFound, """{ "code": "REPORT_NOT_FOUND", "message": "x" }""")));

        var result = await controller.Download("nope", Excel(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Download_UpstreamDown_Returns502WithoutLeakingUpstreamDetail()
    {
        var controller = CreateController(new FakeHandler(_ => Json(HttpStatusCode.ServiceUnavailable,
            """{ "code": "DATA_SOURCE_UNAVAILABLE", "message": "ODBC SQL0204 MVXC300.MITMAS not found" }""")));

        var result = await controller.Download("inventory.item-list", Excel(), CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(502, error.StatusCode);
        Assert.DoesNotContain("ODBC", ErrorText(error));
    }

    [Theory]
    [InlineData("../exchange-rates")]
    [InlineData("inventory item list")]
    public async Task Download_MalformedReportId_Returns400WithoutCallingUpstream(string id)
    {
        var handler = new FakeHandler(_ => throw new InvalidOperationException("must not be called"));

        var result = await CreateController(handler).Download(id, Excel(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null(handler.LastRequest);
    }

    [Theory]
    [InlineData("json")]
    [InlineData("csv")]
    public async Task Download_NonFileFormat_Returns400(string format)
    {
        var handler = new FakeHandler(_ => throw new InvalidOperationException("must not be called"));

        var result = await CreateController(handler).Download(
            "inventory.item-list", new ReportDownloadRequest { Format = format }, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private static string ErrorText(ObjectResult result) =>
        result.Value?.GetType().GetProperty("error")?.GetValue(result.Value)?.ToString() ?? string.Empty;
}
