using System;
using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record AuditEvent(
    string EventType,
    string UserId,
    string ResourceId,
    RiskLevel RiskLevel,
    DateTimeOffset Timestamp,
    IReadOnlyDictionary<string, object> Data
);
