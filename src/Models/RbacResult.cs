namespace MovexPortal.Models;

public sealed record RbacResult(
    bool Authorized,
    string? Reason,
    string? MatchedRole,
    RiskLevel RiskLevel
);
