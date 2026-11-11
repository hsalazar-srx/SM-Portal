using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
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

    [Theory]
    [InlineData("SupplyChain_Buyer")]
    [InlineData("SupplyChain_Planner")]
    [InlineData("SupplyChain_Manager")]
    public async Task SupplyChainRoles_AreDefined_AndGrantNoM3Endpoints(string name)
    {
        // The Workbench roles are the contract with SupplyChainAccess. The planner group may be empty until
        // AD creates it: empty means nobody holds the role (deny by default).
        var config = await new RbacConfigProvider(ConfigPath()).GetConfigAsync();

        var role = Assert.Single(config.Roles, r => r.Name == name);
        Assert.NotNull(role.AdGroups);
        Assert.Empty(role.AllowedEndpoints);
    }

    [Fact]
    public async Task SupplyChainRoles_MapToTheAgreedGroups()
    {
        var config = await new RbacConfigProvider(ConfigPath()).GetConfigAsync();
        string[] Groups(string role) => config.Roles.Single(r => r.Name == role).AdGroups.ToArray();

        Assert.Equal(new[] { @"SRXGLOBAL\pur-buyer" }, Groups("SupplyChain_Buyer"));
        Assert.Equal(new[] { @"SRXGLOBAL\pur-manager", @"SRXGLOBAL\pur-admin" }, Groups("SupplyChain_Manager"));
    }
}
