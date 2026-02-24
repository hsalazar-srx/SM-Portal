using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using MovexPortal.Models;
using MovexPortal.Services;

namespace MovexPortal.Middleware;

// Implements: architecture/audit-logging-framework
public sealed class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public AuditLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        await _next(context).ConfigureAwait(false);

        if (context.Items.TryGetValue("EndpointDefinition", out var endpointObj) && endpointObj is EndpointDefinition endpoint)
        {
            var userId = context.User.Identity?.Name ?? "UNKNOWN";
            var eventType = context.Response.StatusCode >= 400 ? "error" : "execute";

            var data = new Dictionary<string, object>
            {
                ["path"] = context.Request.Path.Value ?? string.Empty,
                ["method"] = context.Request.Method,
                ["statusCode"] = context.Response.StatusCode
            };

            var auditEvent = new AuditEvent(
                eventType,
                userId,
                $"{endpoint.Program}/{endpoint.Method}",
                endpoint.RiskLevel,
                DateTimeOffset.UtcNow,
                data);

            await auditService.LogAsync(auditEvent, context.RequestAborted).ConfigureAwait(false);
        }
    }
}
