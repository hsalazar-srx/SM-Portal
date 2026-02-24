using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record EndpointDefinition(
    string Id,
    string Program,
    string Method,
    string DisplayName,
    string RequiredRole,
    RiskLevel RiskLevel,
    string? Category,
    IReadOnlyList<EndpointField> Fields
);
