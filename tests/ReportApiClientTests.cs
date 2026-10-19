using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

/// <summary>
/// ReportApiClient against a fake Reporting-Service. The download path must hand the
/// workbook bytes through untouched — never deserialise them — and must surface the
/// Reporting-Service's own explanation when it rejects a request.
/// </summary>
public class ReportApiClientTests
{
    private const string XlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    [Fact]
    public async Task ListReportsAsync_ReturnsCatalogWithParameters()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, """
            [{ "id": "inventory.item-list", "displayName": "Inventory List", "domain": "InventoryManagement",
               "supportedFormats": ["json","excel"], "defaultFormat": "excel",
               "parameters": [{ "name": "companyCode", "displayName": "Company", "type": "string",
                                "required": false, "allowedValues": ["100","300"] }] }]
            """));

        var reports = await CreateClient(handler).ListReportsAsync();

        var report = Assert.Single(reports);
        Assert.Equal("inventory.item-list", report.Id);
        Assert.Equal(new[] { "100", "300" }, Assert.Single(report.Parameters).AllowedValues);
        Assert.Equal("api/v1/reports", handler.LastRequest!.RequestUri!.PathAndQuery.TrimStart('/'));
    }

    [Fact]
    public async Task ListReportsAsync_CarriesHelpThrough()
    {
        // The portal shows the catalog's help beside the report; it must arrive whole.
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, """
            [{ "id": "finance.inventory-valuation", "displayName": "Inventory Valuation",
               "help": { "sections": [
                 { "title": "The four sheets", "text": "Read them in this order.",
                   "items": [ { "term": "Reconciliation", "text": "Does the total look right?" } ] },
                 { "title": "Before you rely on it", "bullets": [ "Check the company.", "Check the date." ] } ] } }]
            """));

        var report = Assert.Single(await CreateClient(handler).ListReportsAsync());

        Assert.NotNull(report.Help);
        Assert.Equal(new[] { "The four sheets", "Before you rely on it" }, report.Help!.Sections.Select(s => s.Title));
        var sheets = report.Help.Sections[0];
        Assert.Equal("Read them in this order.", sheets.Text);
        var item = Assert.Single(sheets.Items);
        Assert.Equal("Reconciliation", item.Term);
        Assert.Equal("Does the total look right?", item.Text);
        Assert.Equal(new[] { "Check the company.", "Check the date." }, report.Help.Sections[1].Bullets);
    }

    [Fact]
    public async Task ListReportsAsync_ReportWithoutHelp_HasNullHelp()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, """[{ "id": "x.y", "displayName": "X" }]"""));

        var report = Assert.Single(await CreateClient(handler).ListReportsAsync());

        Assert.Null(report.Help);
    }

    [Fact]
    public async Task DownloadAsync_ReturnsBytesAndContentTypeUnchanged()
    {
        var bytes = new byte[] { 0x50, 0x4B, 0x03, 0x04, 0x00, 0xFF };   // zip magic + non-text bytes
        var handler = new FakeHandler(_ => File(bytes, "inventory.item-list-2026-10-01.xlsx"));

        var file = await CreateClient(handler).DownloadAsync("inventory.item-list", "excel", new());

        Assert.NotNull(file);
        Assert.Equal(bytes, file!.Content);
        Assert.Equal(XlsxType, file.ContentType);
        Assert.Equal("inventory.item-list-2026-10-01.xlsx", file.FileName);
    }

    [Fact]
    public async Task DownloadAsync_PostsFormatAndOnlyNonBlankParameters()
    {
        var handler = new FakeHandler(_ => File([1], "x.xlsx"));

        await CreateClient(handler).DownloadAsync("inventory.item-list", "excel",
            new() { ["companyCode"] = "100", ["itemGroup"] = "  ", ["excludeStatus"] = null });

        Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
        Assert.Equal("api/v1/reports/inventory.item-list/execute",
            handler.LastRequest.RequestUri!.PathAndQuery.TrimStart('/'));

        using var body = JsonDocument.Parse(handler.LastBody!);
        Assert.Equal("excel", body.RootElement.GetProperty("format").GetString());
        var parameters = body.RootElement.GetProperty("parameters");
        Assert.Equal("100", parameters.GetProperty("companyCode").GetString());
        Assert.False(parameters.TryGetProperty("itemGroup", out _));
        Assert.False(parameters.TryGetProperty("excludeStatus", out _));
    }

    [Fact]
    public async Task DownloadAsync_NoContentDisposition_FallsBackToReportIdAndDate()
    {
        var handler = new FakeHandler(_ =>
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent([1]) };
            response.Content.Headers.ContentType = new MediaTypeHeaderValue(XlsxType);
            return response;
        });

        var file = await CreateClient(handler).DownloadAsync("inventory.item-list", "excel", new());

        Assert.StartsWith("inventory.item-list-", file!.FileName);
        Assert.EndsWith(".xlsx", file.FileName);
    }

    [Fact]
    public async Task DownloadAsync_UpstreamRejects_ThrowsWithItsMessage()
    {
        // e.g. the row-limit guard or an invalid parameter — the message is meant for the user.
        var handler = new FakeHandler(_ => Json(HttpStatusCode.BadRequest, """
            { "code": "PARAMETER_VALIDATION_FAILED",
              "message": "The report has more than 250000 rows. Filter by Item Group to narrow it.",
              "correlationId": "abc", "timestamp": "2026-10-01T00:00:00Z" }
            """));

        var ex = await Assert.ThrowsAsync<ReportRejectedException>(() =>
            CreateClient(handler).DownloadAsync("inventory.item-list", "excel", new()));

        Assert.Contains("Filter by Item Group", ex.Message);
    }

    [Fact]
    public async Task DownloadAsync_UnknownReport_ReturnsNull()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.NotFound, """{ "code": "REPORT_NOT_FOUND", "message": "x" }"""));

        var file = await CreateClient(handler).DownloadAsync("nope", "excel", new());

        Assert.Null(file);
    }

    [Fact]
    public async Task DownloadAsync_UpstreamServerError_ThrowsHttpRequestException()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.ServiceUnavailable, """{ "code": "DATA_SOURCE_UNAVAILABLE", "message": "x" }"""));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() =>
            CreateClient(handler).DownloadAsync("inventory.item-list", "excel", new()));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, ex.StatusCode);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    internal static ReportApiClient CreateClient(HttpMessageHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("http://reporting.test/") },
            NullLogger<ReportApiClient>.Instance);

    internal static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    internal static HttpResponseMessage File(byte[] bytes, string fileName)
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) };
        response.Content.Headers.ContentType = new MediaTypeHeaderValue(XlsxType);
        response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = fileName,
            FileNameStar = fileName
        };
        return response;
    }

    internal sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return respond(request);
        }
    }
}
