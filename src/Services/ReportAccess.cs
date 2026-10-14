using System.Security.Claims;
using System.Security.Principal;

namespace MovexPortal.Services;

/// <summary>
/// Decides whether a user holds the role a report requires. Roles and their AD groups come from
/// config/rbac-config.json (the same file as the M3 roles), e.g.
///
///   { "name": "Reporting_Read", "adGroups": [ "SRXGLOBAL\\PORTAL-REPORTS-FIN" ], ... }
///
/// The role names are the catalog's per-report "requiredRole". Windows authentication carries AD
/// groups only as SIDs (groupsid claims), so group names are resolved to SIDs once, at startup,
/// and matched against the token. Nested groups work — Windows puts them in the token.
/// An entry may also be a SID ("S-1-5-21-…"), used as-is when name lookup is unavailable.
///
/// Deny by default: a role with no groups, or a group that cannot be resolved, grants nothing.
/// An unresolvable group is logged and skipped rather than stopping the portal.
///
/// Shares only the config file with the M3 RBAC — none of RbacMiddleware's endpoint or
/// risk-level rules apply here.
/// </summary>
public sealed class ReportAccess
{
    private readonly IReadOnlyDictionary<string, IReadOnlyCollection<string>> _roleSids;

    public ReportAccess(IReadOnlyDictionary<string, IReadOnlyCollection<string>> roleSids)
    {
        _roleSids = new Dictionary<string, IReadOnlyCollection<string>>(roleSids, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>True when the user holds the role a report requires.</summary>
    public bool CanRun(ClaimsPrincipal user, string? requiredRole)
    {
        if (string.IsNullOrWhiteSpace(requiredRole) || !_roleSids.TryGetValue(requiredRole, out var sids))
            return false;

        return UserSids(user).Overlaps(sids);
    }

    // Group memberships plus the user's own SID (so a person can be mapped directly).
    // Deny-only SIDs are deliberately excluded.
    private static HashSet<string> UserSids(ClaimsPrincipal user) =>
        user.Claims
            .Where(c => c.Type == ClaimTypes.GroupSid || c.Type == ClaimTypes.PrimarySid)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    /// <summary>Builds the role → SID map, resolving each configured account name.</summary>
    public static ReportAccess FromConfiguration(
        Dictionary<string, string[]> roleGroups,
        Func<string, string?> resolveSid,
        ILogger logger)
    {
        var roleSids = new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var (role, groups) in roleGroups)
        {
            var sids = new List<string>();
            foreach (var group in groups.Where(g => !string.IsNullOrWhiteSpace(g)))
            {
                // An entry that is already a SID is used as-is — the fallback when name lookup
                // is unavailable on the server.
                string? sid = null;
                if (group.Trim().StartsWith("S-1-", StringComparison.OrdinalIgnoreCase))
                    sid = group.Trim();
                else
                {
                    try { sid = resolveSid(group.Trim()); }
                    catch (Exception ex) { logger.LogError(ex, "[ReportAccess] Could not resolve AD group {Group}", group); }
                }

                if (sid is null)
                {
                    logger.LogError("[ReportAccess] AD group {Group} for role {Role} not found — it grants no access", group, role);
                    continue;
                }

                sids.Add(sid);
                logger.LogInformation("[ReportAccess] Role {Role} ← {Group}", role, group);
            }

            if (sids.Count == 0)
                logger.LogWarning("[ReportAccess] Role {Role} has no resolvable AD groups — nobody can run its reports", role);

            roleSids[role] = sids;
        }

        return new ReportAccess(roleSids);
    }

    /// <summary>Resolves "DOMAIN\Group" to its SID via the domain the server belongs to.</summary>
    public static string? ResolveWindowsAccount(string accountName) =>
        OperatingSystem.IsWindows()
            ? new NTAccount(accountName).Translate(typeof(SecurityIdentifier)).Value
            : null;
}
