using System.Security.Claims;

namespace MovexPortal.Services;

/// <summary>
/// Which Supply Chain Workbench role a signed-in person acts in. The three roles and their AD groups are in
/// config/rbac-config.json (same file and same SID matching as <see cref="ReportAccess"/>); this only chooses
/// among them.
///
/// Reporting-Service takes one role per request, so a person in several groups acts in the most powerful:
/// manager over planner over buyer (plan, 2026-11-06). A person in none has no role, so no access.
/// Reporting-Service then decides what the role may see and change; the portal only says which role it is.
/// </summary>
public sealed class SupplyChainAccess(ReportAccess access)
{
    public const string BuyerRole = "SupplyChain_Buyer";
    public const string PlannerRole = "SupplyChain_Planner";
    public const string ManagerRole = "SupplyChain_Manager";

    /// <summary>"manager", "planner" or "buyer" (the values Reporting-Service's X-SC-Role takes), or null for no access.</summary>
    public string? RoleOf(ClaimsPrincipal user)
    {
        if (access.CanRun(user, ManagerRole)) return "manager";
        if (access.CanRun(user, PlannerRole)) return "planner";
        if (access.CanRun(user, BuyerRole)) return "buyer";
        return null;
    }
}
