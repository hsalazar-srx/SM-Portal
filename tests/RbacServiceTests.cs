using System.Collections.Generic;
using System.Threading.Tasks;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

public class RbacServiceTests
{
    private static IRbacService CreateService(RbacConfig config)
    {
        var provider = new TestRbacConfigProvider(config);
        return new RbacService(provider);
    }

    [Fact]
    public async Task Admin_Override_Allows_Access()
    {
        var config = TestConfigs.Basic;
        var service = CreateService(config);
        var user = new UserContext("admin", new List<string> { "ADMIN" });
        var endpoint = TestConfigs.Endpoint("IT_Write", RiskLevel.High);
        var result = await service.AuthorizeAsync(user, endpoint);
        Assert.True(result.Authorized);
        Assert.Equal("ADMIN", result.MatchedRole);
    }

    [Fact]
    public async Task Role_Allowed_For_Endpoint()
    {
        var config = TestConfigs.Basic;
        var service = CreateService(config);
        var user = new UserContext("user1", new List<string> { "IT_Write" });
        var endpoint = TestConfigs.Endpoint("IT_Write", RiskLevel.High);
        var result = await service.AuthorizeAsync(user, endpoint);
        Assert.True(result.Authorized);
        Assert.Equal("IT_Write", result.MatchedRole);
    }

    [Fact]
    public async Task Role_Denied_If_Not_Allowed()
    {
        var config = TestConfigs.Basic;
        var service = CreateService(config);
        var user = new UserContext("user2", new List<string> { "Inventory_Read" });
        var endpoint = TestConfigs.Endpoint("IT_Write", RiskLevel.High);
        var result = await service.AuthorizeAsync(user, endpoint);
        Assert.False(result.Authorized);
    }

    [Fact]
    public async Task Denied_If_Risk_Exceeds_Max()
    {
        var config = TestConfigs.Basic;
        var service = CreateService(config);
        var user = new UserContext("user3", new List<string> { "Inventory_Read" });
        var endpoint = TestConfigs.Endpoint("Inventory_Read", RiskLevel.High);
        var result = await service.AuthorizeAsync(user, endpoint);
        Assert.False(result.Authorized);
    }

    private class TestRbacConfigProvider : IRbacConfigProvider
    {
        private readonly RbacConfig _config;
        public TestRbacConfigProvider(RbacConfig config) => _config = config;
        public Task<RbacConfig> GetConfigAsync(System.Threading.CancellationToken cancellationToken = default) => Task.FromResult(_config);
    }

    private static class TestConfigs
    {
        public static RbacConfig Basic => new RbacConfig(new List<RbacRoleConfig>
        {
            new RbacRoleConfig("IT_Write", "Modify inventory", new List<string>(), new List<string>{"mms175-update", "IT_Write"}, "HIGH"),
            new RbacRoleConfig("Inventory_Read", "Read inventory", new List<string>(), new List<string>{"mms175-update", "Inventory_Read"}, "LOW")
        });

        public static EndpointDefinition Endpoint(string requiredRole, RiskLevel risk) =>
            new EndpointDefinition("mms175-update", "MMS175", "update", "Update Inventory", requiredRole, risk, null, new List<EndpointField>());
    }
}
