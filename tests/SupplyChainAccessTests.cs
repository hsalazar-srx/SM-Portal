using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

/// <summary>
/// Which Supply Chain role a person acts in. Reporting-Service takes one role per request, so a person in
/// several groups is resolved to the most powerful: manager over planner over buyer. A person in none gets
/// no role and therefore no access (deny by default).
/// </summary>
public class SupplyChainAccessTests
{
    private const string BuyerSid = "S-1-5-21-100-200-300-1001";
    private const string PlannerSid = "S-1-5-21-100-200-300-1002";
    private const string ManagerSid = "S-1-5-21-100-200-300-1003";
    private const string OtherSid = "S-1-5-21-100-200-300-9999";

    private static SupplyChainAccess Access(string[]? planner = null) => new(new ReportAccess(
        new Dictionary<string, IReadOnlyCollection<string>>
        {
            [SupplyChainAccess.BuyerRole] = [BuyerSid],
            [SupplyChainAccess.PlannerRole] = planner ?? [PlannerSid],
            [SupplyChainAccess.ManagerRole] = [ManagerSid],
        }));

    private static ClaimsPrincipal In(params string[] sids) =>
        ReportAccessTests.User(sids.Select(s => (ClaimTypes.GroupSid, s)).ToArray());

    [Theory]
    [InlineData(BuyerSid, "buyer")]
    [InlineData(PlannerSid, "planner")]
    [InlineData(ManagerSid, "manager")]
    public void APersonInOneRolesGroup_ActsInThatRole(string sid, string expected) =>
        Assert.Equal(expected, Access().RoleOf(In(sid)));

    [Fact]
    public void APersonInNoRolesGroup_HasNoRole() =>
        Assert.Null(Access().RoleOf(In(OtherSid)));

    [Fact]
    public void ManagerBeatsPlannerAndBuyer() =>
        Assert.Equal("manager", Access().RoleOf(In(BuyerSid, PlannerSid, ManagerSid)));

    [Fact]
    public void PlannerBeatsBuyer() =>
        Assert.Equal("planner", Access().RoleOf(In(BuyerSid, PlannerSid)));

    [Fact]
    public void ARoleWithNoGroupsYet_GrantsNothing()
    {
        // The planner group has not been created in AD yet: the role exists but is empty.
        var access = Access(planner: []);

        Assert.Null(access.RoleOf(In(PlannerSid)));
        Assert.Equal("buyer", access.RoleOf(In(BuyerSid, PlannerSid)));
    }

    [Fact]
    public void RoleNamesMatchTheOnesInRbacConfig()
    {
        // Role names are the contract with config/rbac-config.json (RbacConfigFileTests loads the real file).
        Assert.Equal("SupplyChain_Buyer", SupplyChainAccess.BuyerRole);
        Assert.Equal("SupplyChain_Planner", SupplyChainAccess.PlannerRole);
        Assert.Equal("SupplyChain_Manager", SupplyChainAccess.ManagerRole);
    }
}
