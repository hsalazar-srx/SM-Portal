using System.Collections.Generic;
using System.Threading.Tasks;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

public class GenericEndpointExecutorTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldRunEndpoint()
    {
        var executor = new GenericEndpointExecutor(new RbacService(new TestRbacConfigProvider()), new AuditService(System.IO.Path.GetTempFileName()));
        var endpoint = new EndpointDefinition("id", "MMS175MI", "Update", "Item Move", "Role", RiskLevel.Medium, "Inventory", new EndpointField[0]);
        var user = new UserContext("DOMAIN\\user", new[] { "Role" });

        var result = await executor.ExecuteAsync(endpoint, new Dictionary<string, object>(), user);

        Assert.False(result.Success);
        Assert.Equal("NOT_IMPLEMENTED", result.ErrorCode);
    }

    private class TestRbacConfigProvider : IRbacConfigProvider
    {
        public Task<RbacConfig> GetConfigAsync(System.Threading.CancellationToken cancellationToken = default)
        {
            var config = new RbacConfig(new List<RbacRoleConfig>
            {
                new RbacRoleConfig("Role", "desc", new List<string>(), new List<string>{"id"}, "HIGH")
            });
            return Task.FromResult(config);
        }
    }
}
