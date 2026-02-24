using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

public class AuditServiceTests
{
    [Fact]
    public async Task LogAsync_ShouldPersistAudit()
    {
        var path = System.IO.Path.GetTempFileName();
        var service = new AuditService(path);
        var auditEvent = new AuditEvent("execute", "DOMAIN\\user", "MMS175MI/Update", RiskLevel.High, DateTimeOffset.UtcNow, new Dictionary<string, object>());

        var id = await service.LogAsync(auditEvent);

        Assert.False(string.IsNullOrWhiteSpace(id));
    }
}
