using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record RbacRoleConfig(
    string Name,
    string Description,
    IReadOnlyList<string> AdGroups,
    IReadOnlyList<string> AllowedEndpoints,
    string MaxRiskLevel
);

public sealed record RbacConfig(
    IReadOnlyList<RbacRoleConfig> Roles
);