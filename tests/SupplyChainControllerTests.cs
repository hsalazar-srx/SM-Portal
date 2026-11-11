using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using MovexPortal.Controllers;
using MovexPortal.Models;
using MovexPortal.Services;
using Polly.CircuitBreaker;
using Xunit;
using static MovexPortal.Tests.ReportApiClientTests;

namespace MovexPortal.Tests;

/// <summary>
/// SupplyChainController: who may use the Workbench and in which role, that the role and the user's name sent to
/// Reporting-Service come from the sign-in and never from the browser, how Reporting-Service's answers map to what
/// the browser sees, and that every edit is audited (what was touched, never the text typed).
/// </summary>
public class SupplyChainControllerTests
{
    private const string BuyerSid = "S-1-5-21-100-200-300-1001";
    private const string ManagerSid = "S-1-5-21-100-200-300-1003";
    private const string OtherSid = "S-1-5-21-100-200-300-9999";

    private static readonly SupplyChainAccess Access = new(new ReportAccess(
        new Dictionary<string, IReadOnlyCollection<string>>
        {
            [SupplyChainAccess.BuyerRole] = [BuyerSid],
            [SupplyChainAccess.PlannerRole] = [],
            [SupplyChainAccess.ManagerRole] = [ManagerSid],
        }));

    private static ClaimsPrincipal Buyer() => ReportAccessTests.User((ClaimTypes.GroupSid, BuyerSid));
    private static ClaimsPrincipal Manager() => ReportAccessTests.User((ClaimTypes.GroupSid, ManagerSid));
    private static ClaimsPrincipal Nobody() => ReportAccessTests.User((ClaimTypes.GroupSid, OtherSid));

    private sealed class RecordingAudit : IAuditService
    {
        public List<AuditEvent> Events { get; } = [];
        public bool Fail { get; set; }

        public Task<string> LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
        {
            if (Fail) throw new InvalidOperationException("audit store unavailable");
            Events.Add(auditEvent);
            return Task.FromResult("audit-1");
        }
    }

    private static SupplyChainController Controller(
        FakeHandler handler, ClaimsPrincipal user, RecordingAudit? audit = null, string query = "",
        IDictionary<string, string>? browserHeaders = null)
    {
        var client = new SupplyChainApiClient(
            new HttpClient(handler) { BaseAddress = new Uri("http://reporting.test/") },
            NullLogger<SupplyChainApiClient>.Instance);
        var http = new DefaultHttpContext { User = user, TraceIdentifier = "trace-1" };
        http.Request.QueryString = new QueryString(query);
        foreach (var (name, value) in browserHeaders ?? new Dictionary<string, string>())
            http.Request.Headers[name] = value;
        return new SupplyChainController(client, Access, audit ?? new RecordingAudit(), NullLogger<SupplyChainController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = http },
        };
    }

    private static FakeHandler Upstream(HttpStatusCode status = HttpStatusCode.OK, string body = "{}") =>
        new(_ => Json(status, body));

    private static (int Status, string Body) Outcome(IActionResult result) => result switch
    {
        ContentResult c => (c.StatusCode ?? 200, c.Content ?? string.Empty),
        ObjectResult o => (o.StatusCode ?? 200, JsonSerializer.Serialize(o.Value)),
        _ => throw new InvalidOperationException($"Unexpected result {result.GetType().Name}"),
    };

    private static JsonElement Parse(string text) => JsonDocument.Parse(text).RootElement.Clone();

    // ── Access ────────────────────────────────────────────────────────────────────

    [Fact]
    public void Access_APersonWithARole_IsAllowedAndToldWhich()
    {
        var (status, body) = Outcome(Controller(Upstream(), Buyer()).GetAccess());

        Assert.Equal(200, status);
        Assert.Contains("\"allowed\":true", body);
        Assert.Contains("\"role\":\"buyer\"", body);
    }

    [Fact]
    public void Access_APersonWithNoRole_IsNotAllowed()
    {
        var (_, body) = Outcome(Controller(Upstream(), Nobody()).GetAccess());

        Assert.Contains("\"allowed\":false", body);
        Assert.Contains("\"role\":null", body);
    }

    // ── Reading ───────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("rows")]
    [InlineData("summary")]
    [InlineData("trend")]
    [InlineData("categories")]
    public async Task Read_WithNoRole_Is403_AndNothingLeavesThePortal(string resource)
    {
        var handler = Upstream();

        var result = await Read(Controller(handler, Nobody()), resource);

        Assert.Equal(403, Outcome(result).Status);
        Assert.Null(handler.LastRequest);
    }

    private static Task<IActionResult> Read(SupplyChainController c, string resource) => resource switch
    {
        "rows" => c.Rows(),
        "summary" => c.Summary(),
        "trend" => c.Trend(),
        _ => c.Categories(),
    };

    [Fact]
    public async Task Rows_ReturnsReportingServicesJson_AndTheRoleFromTheSignIn()
    {
        var handler = Upstream(body: """{"total":1,"rows":[{"item":"X"}]}""");

        var result = await Controller(handler, Buyer(), query: "?division=D&pageSize=50").Rows();

        var (status, body) = Outcome(result);
        Assert.Equal(200, status);
        Assert.Equal("""{"total":1,"rows":[{"item":"X"}]}""", body);
        Assert.Equal("application/json", ((ContentResult)result).ContentType);
        Assert.Equal("buyer", handler.LastRequest!.Headers.GetValues("X-SC-Role").Single());
        Assert.Equal(@"SRXGLOBAL\someone", handler.LastRequest.Headers.GetValues("X-SC-User").Single());
        Assert.Equal("trace-1", handler.LastRequest.Headers.GetValues("X-Correlation-Id").Single());
    }

    [Fact]
    public async Task Rows_ARoleOrNameSentByTheBrowser_IsIgnored()
    {
        var handler = Upstream();
        var forged = new Dictionary<string, string> { ["X-SC-Role"] = "manager", ["X-SC-User"] = @"SRXGLOBAL\ceo" };

        await Controller(handler, Buyer(), query: "?division=D&role=manager", browserHeaders: forged).Rows();

        Assert.Equal("buyer", handler.LastRequest!.Headers.GetValues("X-SC-Role").Single());
        Assert.Equal(@"SRXGLOBAL\someone", handler.LastRequest.Headers.GetValues("X-SC-User").Single());
        Assert.DoesNotContain("role=", handler.LastRequest.RequestUri!.Query);
    }

    [Fact]
    public async Task Rows_OnlyTheKnownFiltersAreForwarded()
    {
        var handler = Upstream();

        await Controller(handler, Manager(),
            query: "?division=D&okNg=ng&card=noPo&sort=item&page=2&pageSize=50&refresh=true&bogus=1&_=123").Rows();

        var query = handler.LastRequest!.RequestUri!.Query;
        foreach (var kept in new[] { "division=D", "okNg=ng", "card=noPo", "sort=item", "page=2", "pageSize=50", "refresh=true" })
            Assert.Contains(kept, query);
        Assert.DoesNotContain("bogus", query);
        Assert.DoesNotContain("_=", query);
    }

    [Fact]
    public async Task Summary_AndTrend_ForwardTheirOwnParameters()
    {
        var summary = Upstream();
        await Controller(summary, Manager(), query: "?division=D&refresh=true&weeks=3").Summary();
        Assert.Contains("refresh=true", summary.LastRequest!.RequestUri!.Query);
        Assert.DoesNotContain("weeks", summary.LastRequest.RequestUri.Query);

        var trend = Upstream();
        await Controller(trend, Manager(), query: "?division=D&weeks=3&refresh=true").Trend();
        Assert.Contains("weeks=3", trend.LastRequest!.RequestUri!.Query);
        Assert.DoesNotContain("refresh", trend.LastRequest.RequestUri.Query);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Conflict)]
    public async Task Rows_ReportingServicesOwnExplanation_PassesThrough(HttpStatusCode upstream)
    {
        var result = await Controller(Upstream(upstream, """{"code":"X","message":"card must be one of: noPo"}"""), Manager()).Rows();

        var (status, body) = Outcome(result);
        Assert.Equal((int)upstream, status);
        Assert.Contains("card must be one of", body);
    }

    [Fact]
    public async Task Rows_StoreBusy_Is503_WithRetryAfter()
    {
        var handler = new FakeHandler(_ =>
        {
            var r = Json(HttpStatusCode.ServiceUnavailable, """{"code":"STORE_BUSY"}""");
            r.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(2));
            return r;
        });
        var controller = Controller(handler, Manager());

        var (status, _) = Outcome(await controller.Rows());

        Assert.Equal(503, status);
        Assert.Equal("2", controller.Response.Headers["Retry-After"].ToString());
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]        // the portal's API key is wrong: a configuration fault, not the user's
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadGateway)]
    public async Task Rows_AnUpstreamFault_IsASanitised502(HttpStatusCode upstream)
    {
        var result = await Controller(Upstream(upstream, """{"secret":"stack trace and key"}"""), Manager()).Rows();

        var (status, body) = Outcome(result);
        Assert.Equal(502, status);
        Assert.DoesNotContain("secret", body);
        Assert.Contains("trace-1", body);
    }

    [Fact]
    public async Task Rows_ReportingServiceUnreachable_Is502()
    {
        var handler = new FakeHandler(_ => throw new HttpRequestException("connection refused"));

        Assert.Equal(502, Outcome(await Controller(handler, Manager()).Rows()).Status);
    }

    [Fact]
    public async Task Rows_CircuitOpen_Is502()
    {
        var handler = new FakeHandler(_ => throw new BrokenCircuitException());

        Assert.Equal(502, Outcome(await Controller(handler, Manager()).Rows()).Status);
    }

    [Fact]
    public async Task Rows_UpstreamTimeout_Is504()
    {
        var handler = new FakeHandler(_ => throw new TaskCanceledException("timed out"));

        Assert.Equal(504, Outcome(await Controller(handler, Manager()).Rows()).Status);
    }

    // ── Editing ───────────────────────────────────────────────────────────────────

    private const string EditBody = """{"division":"D","lineKey":"9118010|ITEM1|1","category":"Expediting","details":"do not log me"}""";

    [Fact]
    public async Task Patch_WithNoRole_Is403_NothingIsSent_AndTheAttemptIsAudited()
    {
        var handler = Upstream();
        var audit = new RecordingAudit();

        var result = await Controller(handler, Nobody(), audit).PatchEntry(Parse(EditBody));

        Assert.Equal(403, Outcome(result).Status);
        Assert.Null(handler.LastRequest);
        Assert.Equal("denied", Assert.Single(audit.Events).EventType);
    }

    [Fact]
    public async Task Patch_ForwardsTheBodyAsIs_WithTheRoleFromTheSignIn()
    {
        var handler = Upstream(body: """{"status":"Saved"}""");

        var result = await Controller(handler, Buyer()).PatchEntry(Parse(EditBody));

        Assert.Equal((200, """{"status":"Saved"}"""), Outcome(result));
        Assert.Equal(HttpMethod.Patch, handler.LastRequest!.Method);
        Assert.Equal(EditBody, handler.LastBody);
        Assert.Equal("buyer", handler.LastRequest.Headers.GetValues("X-SC-Role").Single());
    }

    [Fact]
    public async Task Patch_IsAudited_WithWhatWasTouched_AndNeverTheTextTyped()
    {
        var audit = new RecordingAudit();

        await Controller(Upstream(body: """{"status":"Saved"}"""), Buyer(), audit).PatchEntry(Parse(EditBody));

        var evt = Assert.Single(audit.Events);
        Assert.Equal("execute", evt.EventType);
        Assert.Equal(@"SRXGLOBAL\someone", evt.UserId);
        Assert.Equal("supplychain/entry", evt.ResourceId);
        Assert.Equal(RiskLevel.Medium, evt.RiskLevel);
        Assert.Equal("D", evt.Data["division"]);
        Assert.Equal("9118010|ITEM1|1", evt.Data["lineKey"]);
        Assert.Equal("category,details", evt.Data["fields"]);
        Assert.Equal("buyer", evt.Data["role"]);
        Assert.Equal(200, evt.Data["statusCode"]);
        Assert.DoesNotContain(evt.Data.Values, v => v.ToString()!.Contains("do not log me"));
        Assert.DoesNotContain(evt.Data.Values, v => v.ToString()!.Contains("Expediting"));
    }

    [Fact]
    public async Task Patch_AConflict_PassesThroughWithWhoChangedIt_AndIsAuditedAsAnError()
    {
        var audit = new RecordingAudit();
        var handler = Upstream(HttpStatusCode.Conflict, """{"code":"EDIT_CONFLICT","changedBy":"SRXGLOBAL\\other"}""");

        var result = await Controller(handler, Buyer(), audit).PatchEntry(Parse(EditBody));

        Assert.Equal(409, Outcome(result).Status);
        var evt = Assert.Single(audit.Events);
        Assert.Equal("error", evt.EventType);
        Assert.Equal(409, evt.Data["statusCode"]);
    }

    [Fact]
    public async Task Patch_WhenReportingServiceIsDown_Is502_AndStillAudited()
    {
        var audit = new RecordingAudit();
        var handler = new FakeHandler(_ => throw new HttpRequestException("down"));

        var result = await Controller(handler, Buyer(), audit).PatchEntry(Parse(EditBody));

        Assert.Equal(502, Outcome(result).Status);
        var evt = Assert.Single(audit.Events);
        Assert.Equal("error", evt.EventType);
        Assert.Equal(502, evt.Data["statusCode"]);
    }

    [Fact]
    public async Task Patch_AFailingAuditStore_DoesNotHideTheSavedResult()
    {
        // The edit already happened in Reporting-Service; telling the person it failed would make them redo it.
        var audit = new RecordingAudit { Fail = true };

        var result = await Controller(Upstream(body: """{"status":"Saved"}"""), Buyer(), audit).PatchEntry(Parse(EditBody));

        Assert.Equal(200, Outcome(result).Status);
    }

    [Theory]
    [InlineData("[1,2]")]
    [InlineData("\"text\"")]
    [InlineData("42")]
    [InlineData("null")]
    public async Task Patch_ABodyThatIsNotAnObject_Is400_AndNothingIsSent(string body)
    {
        var handler = Upstream();

        var result = await Controller(handler, Buyer()).PatchEntry(Parse(body));

        Assert.Equal(400, Outcome(result).Status);
        Assert.Null(handler.LastRequest);
    }
}
