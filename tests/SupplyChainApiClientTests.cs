using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Services;
using Xunit;
using static MovexPortal.Tests.ReportApiClientTests;

namespace MovexPortal.Tests;

/// <summary>
/// SupplyChainApiClient against a fake Reporting-Service. It is a thin pipe: it adds who is asking (from the
/// signed-in user, never from the browser), reaches only the four Workbench resources, and hands back the
/// upstream status and body untouched so the controller can decide what the browser sees.
/// </summary>
public class SupplyChainApiClientTests
{
    private static readonly SupplyChainIdentity Buyer = new(@"SRXGLOBAL\ypkhor10", "buyer");

    private static SupplyChainApiClient Client(FakeHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("http://reporting.test/") },
            NullLogger<SupplyChainApiClient>.Instance);

    private static IEnumerable<KeyValuePair<string, string?>> Query(params (string, string?)[] pairs) =>
        pairs.Select(p => new KeyValuePair<string, string?>(p.Item1, p.Item2));

    [Theory]
    [InlineData("rows")]
    [InlineData("summary")]
    [InlineData("trend")]
    [InlineData("categories")]
    public async Task Get_ReachesTheWorkbenchResource(string resource)
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, "{}"));

        await Client(handler).GetAsync(resource, Query(), Buyer);

        Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
        Assert.Equal($"/api/v1/supplychain/workbench/{resource}", handler.LastRequest.RequestUri!.AbsolutePath);
    }

    [Theory]
    [InlineData("sync")]                       // the sync endpoint is not for browsers
    [InlineData("entry")]                      // writes go through PatchEntryAsync
    [InlineData("../reports")]
    [InlineData("rows/../sync")]
    [InlineData("")]
    public async Task Get_AnyOtherResource_IsRefusedBeforeLeavingThePortal(string resource)
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, "{}"));

        await Assert.ThrowsAsync<ArgumentException>(() => Client(handler).GetAsync(resource, Query(), Buyer));

        Assert.Null(handler.LastRequest);
    }

    [Fact]
    public async Task Get_SendsWhoIsAsking_AndACorrelationId()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, "{}"));

        await Client(handler).GetAsync("rows", Query(), Buyer, "corr-1");

        var headers = handler.LastRequest!.Headers;
        Assert.Equal(@"SRXGLOBAL\ypkhor10", headers.GetValues("X-SC-User").Single());
        Assert.Equal("buyer", headers.GetValues("X-SC-Role").Single());
        Assert.Equal("corr-1", headers.GetValues("X-Correlation-Id").Single());
    }

    [Fact]
    public async Task Get_EncodesTheQuery_AndDropsBlankValues()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, "{}"));

        await Client(handler).GetAsync("rows",
            Query(("division", "D"), ("search", "R&D 50%"), ("buyer", ""), ("type", null), ("page", "2")), Buyer);

        var query = handler.LastRequest!.RequestUri!.Query;
        Assert.Contains("division=D", query);
        Assert.Contains("search=R%26D%2050%25", query);
        Assert.Contains("page=2", query);
        Assert.DoesNotContain("buyer=", query);
        Assert.DoesNotContain("type=", query);
    }

    [Fact]
    public async Task Get_ReturnsTheUpstreamStatusAndBodyUntouched()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, """{"total":3,"rows":[]}"""));

        var response = await Client(handler).GetAsync("rows", Query(), Buyer);

        Assert.Equal(HttpStatusCode.OK, response.Status);
        Assert.Equal("""{"total":3,"rows":[]}""", response.Body);
        Assert.Null(response.RetryAfter);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task Get_AnErrorStatus_IsReturnedNotThrown(HttpStatusCode status)
    {
        var handler = new FakeHandler(_ => Json(status, """{"code":"X","message":"why"}"""));

        var response = await Client(handler).GetAsync("rows", Query(), Buyer);

        Assert.Equal(status, response.Status);
        Assert.Contains("why", response.Body);
    }

    [Fact]
    public async Task Get_CarriesRetryAfterThrough()
    {
        var handler = new FakeHandler(_ =>
        {
            var r = Json(HttpStatusCode.ServiceUnavailable, "{}");
            r.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(2));
            return r;
        });

        var response = await Client(handler).GetAsync("rows", Query(), Buyer);

        Assert.Equal("2", response.RetryAfter);
    }

    [Fact]
    public async Task PatchEntry_SendsTheBodyAsJson_WithWhoIsAsking()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.OK, """{"status":"Saved"}"""));
        const string body = """{"division":"D","lineKey":"9118010|ITEM1|1","category":"Expediting"}""";

        var response = await Client(handler).PatchEntryAsync(body, new SupplyChainIdentity(@"SRXGLOBAL\amanager", "manager"));

        Assert.Equal(HttpMethod.Patch, handler.LastRequest!.Method);
        Assert.Equal("/api/v1/supplychain/workbench/entry", handler.LastRequest.RequestUri!.AbsolutePath);
        Assert.Equal(body, handler.LastBody);
        Assert.Equal("application/json", handler.LastRequest.Content!.Headers.ContentType!.MediaType);
        Assert.Equal("manager", handler.LastRequest.Headers.GetValues("X-SC-Role").Single());
        Assert.Equal(HttpStatusCode.OK, response.Status);
    }

    [Fact]
    public async Task PatchEntry_AConflict_ComesBackWithWhoChangedItAndTheCurrentEntry()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.Conflict,
            """{"code":"EDIT_CONFLICT","field":"category","changedBy":"SRXGLOBAL\\other","entry":{"category":"Received"}}"""));

        var response = await Client(handler).PatchEntryAsync("""{"division":"D","lineKey":"k"}""", Buyer);

        Assert.Equal(HttpStatusCode.Conflict, response.Status);
        Assert.Contains("changedBy", response.Body);
    }
}
