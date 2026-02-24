#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Implements: architecture/audit-logging-framework
public sealed class AuditService : IAuditService
{
    private readonly string _auditLogPath;

    public AuditService(string? auditLogPath = null)
    {
        _auditLogPath = auditLogPath ?? Path.Combine(AppContext.BaseDirectory, "logs", "audit-log.jsonl");
    }

    public Task<string> LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_auditLogPath) ?? AppContext.BaseDirectory);

        var recordId = Guid.NewGuid().ToString("N");
        var maskedData = MaskSensitive(auditEvent.Data);

        var record = new
        {
            auditId = recordId,
            auditEvent.EventType,
            auditEvent.UserId,
            auditEvent.ResourceId,
            riskLevel = auditEvent.RiskLevel.ToString(),
            timestamp = auditEvent.Timestamp,
            data = maskedData
        };

        var json = JsonSerializer.Serialize(record);
        return File.AppendAllTextAsync(_auditLogPath, json + Environment.NewLine, cancellationToken)
            .ContinueWith(_ => recordId, cancellationToken);
    }

    private static IReadOnlyDictionary<string, object> MaskSensitive(IReadOnlyDictionary<string, object> data)
    {
        var masked = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in data)
        {
            if (IsSensitiveKey(entry.Key))
            {
                masked[entry.Key] = "***";
            }
            else
            {
                masked[entry.Key] = entry.Value;
            }
        }

        return masked;
    }

    private static bool IsSensitiveKey(string key)
    {
        var markers = new[] { "password", "token", "secret", "ssn", "pin", "key" };
        return markers.Any(marker => key.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }
}
