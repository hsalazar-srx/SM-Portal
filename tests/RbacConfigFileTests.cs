using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

/// <summary>
/// Loads the real config/rbac-config.json through the real provider, so a malformed edit — or a
/// role that silently fails to bind — fails here rather than as "access denied" on the server.
/// </summary>
public class RbacConfigFileTests
{
    private static string ConfigPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "config", "rbac-config.json")))
            dir = dir.Parent;

        Assert.NotNull(dir);
        return Path.Combine(dir!.FullName, "config", "rbac-config.json");
    }

    [Fact]
    public async Task RolesBindFromTheFile()
    {
        var config = await new RbacConfigProvider(ConfigPath()).GetConfigAsync();

        Assert.NotNull(config.Roles);
        Assert.NotEmpty(config.Roles);
        Assert.All(config.Roles, r => Assert.False(string.IsNullOrWhiteSpace(r.Name)));
    }

    [Fact]
    public async Task ReportingReadRole_IsDefinedAndGrantsNoM3Endpoints()
    {
        // The catalog's requiredRole for reports. The group list may be empty until AD provides
        // the group — empty means nobody has access (deny by default).
        var config = await new RbacConfigProvider(ConfigPath()).GetConfigAsync();

        var role = Assert.Single(config.Roles, r => r.Name == "Reporting_Read");
        Assert.NotNull(role.AdGroups);
        Assert.Empty(role.AllowedEndpoints);
    }

    // ── ADR-061: one role per report audience, named in the catalog's requiredRole ─

    private static readonly string[] Adr061Roles =
    [
        "Reporting_General", "Reporting_Finance_Management",
        "Reporting_SupplyChain", "Reporting_SupplyChain_Management"
    ];

    // Until Manal nests grp-fin-manager into the Finance audiences it is listed directly, so Finance
    // keeps today's access. This is the only Business Function group allowed in a reporting role, and
    // only in the roles Finance already runs reports through; remove it once the nesting exists.
    private const string InterimFinanceGroup = "SRXGLOBAL\\grp-fin-manager";
    private static readonly string[] RolesThatMayHoldTheInterimFinanceGroup =
        ["Reporting_Read", "Reporting_General", "Reporting_Finance_Management"];

    private static async Task<IReadOnlyList<RbacRoleConfig>> ReportingRolesAsync() =>
        (await new RbacConfigProvider(ConfigPath()).GetConfigAsync()).Roles
            .Where(r => r.Name.StartsWith("Reporting_", StringComparison.Ordinal)).ToList();

    [Theory]
    [InlineData("Reporting_General")]
    [InlineData("Reporting_Finance_Management")]
    [InlineData("Reporting_SupplyChain")]
    [InlineData("Reporting_SupplyChain_Management")]
    public async Task Adr061Role_IsDefined_WithGroups_AndGrantsNoM3Endpoints(string roleName)
    {
        var role = Assert.Single(await ReportingRolesAsync(), r => r.Name == roleName);

        Assert.NotEmpty(role.AdGroups);
        Assert.Empty(role.AllowedEndpoints);
    }

    [Fact]
    public async Task EveryReportingRole_ListsRptAdmin_ExceptTheLegacyReadAlias()
    {
        // ADR-061 decision 3: rpt-admin (named reporting-support people) is in every reporting role.
        // Reporting_Read is the alias kept until the catalog has moved to the audience roles.
        var roles = (await ReportingRolesAsync()).Where(r => r.Name != "Reporting_Read").ToList();

        Assert.Equal(Adr061Roles.OrderBy(n => n), roles.Select(r => r.Name).OrderBy(n => n));
        Assert.All(roles, r => Assert.Contains("SRXGLOBAL\\rpt-admin", r.AdGroups, StringComparer.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task ReportingRoles_NameOnlyApplicationRoleGroups_OrTheOneInterimFinanceGroup()
    {
        // Applications reference Application Role groups (rpt-*), never Business Function groups
        // (grp-*) or individual accounts — except the named interim entry, in the roles that need it.
        foreach (var role in await ReportingRolesAsync())
            foreach (var group in role.AdGroups)
            {
                var isInterim = string.Equals(group, InterimFinanceGroup, StringComparison.OrdinalIgnoreCase)
                                && RolesThatMayHoldTheInterimFinanceGroup.Contains(role.Name);
                Assert.True(group.StartsWith("SRXGLOBAL\\rpt-", StringComparison.OrdinalIgnoreCase) || isInterim,
                    $"{role.Name} lists '{group}': reporting roles take rpt-* groups (ADR-061), not individual " +
                    "accounts or other Business Function groups.");
            }
    }

    [Theory]
    [InlineData("Reporting_SupplyChain")]
    [InlineData("Reporting_SupplyChain_Management")]
    public async Task SupplyChainRoles_DoNotReachFinanceGroups(string roleName)
    {
        var role = Assert.Single(await ReportingRolesAsync(), r => r.Name == roleName);

        Assert.DoesNotContain(role.AdGroups, g => g.Contains("fin", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("Reporting_General")]
    [InlineData("Reporting_Finance_Management")]
    public async Task FinanceAndGeneralRoles_DoNotReachSupplyChainGroups(string roleName)
    {
        var role = Assert.Single(await ReportingRolesAsync(), r => r.Name == roleName);

        Assert.DoesNotContain(role.AdGroups, g => g.Contains("supplychain", StringComparison.OrdinalIgnoreCase)
                                                  || g.Contains("-sc-", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task SupplyChainManagementRole_UsesOnlyApplicationRoleGroups_NotFinancesGroups()
    {
        // Knowledge vault ADR-061: reports reference Application Role groups (rpt-*); Business Function
        // groups (grp-*) are nested into them in AD. Finance's groups must not reach buyer performance.
        var config = await new RbacConfigProvider(ConfigPath()).GetConfigAsync();

        var role = Assert.Single(config.Roles, r => r.Name == "Reporting_SupplyChain_Management");
        Assert.Empty(role.AllowedEndpoints);
        Assert.NotEmpty(role.AdGroups);
        Assert.All(role.AdGroups, g => Assert.StartsWith("SRXGLOBAL\\rpt-", g));
        Assert.DoesNotContain(role.AdGroups, g => g.Contains("fin", StringComparison.OrdinalIgnoreCase));
    }
}
