#nullable enable

using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record ExecutionResult(
    bool Success,
    string? AuditId,
    IReadOnlyDictionary<string, object>? Data,
    string? ErrorMessage,
    string? ErrorCode
);
