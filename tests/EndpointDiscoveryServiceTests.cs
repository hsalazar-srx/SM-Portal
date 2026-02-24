using System.Collections.Generic;
using System.Threading.Tasks;
using MovexPortal.Models;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

public class EndpointDiscoveryServiceTests
{
    [Fact]
    public async Task GetEndpointsForUserAsync_ShouldFilterEndpoints()
    {
                var registryJson = """
                {
                    "endpoints": [
                        {
                            "id": "mms175-update",
                            "program": "MMS175MI",
                            "method": "Update",
                            "displayName": "Item Movement",
                            "requiredRole": "IT_Write",
                            "riskLevel": "MEDIUM",
                            "fields": []
                        }
                    ]
                }
                """;

                var path = System.IO.Path.GetTempFileName();
                await System.IO.File.WriteAllTextAsync(path, registryJson);

                var registryProvider = new EndpointRegistryProvider(path);
                var rbacService = new RbacService(new TestRbacConfigProvider());
                var discovery = new EndpointDiscoveryService(registryProvider, rbacService);

                var user = new UserContext("DOMAIN\\user", new[] { "Inventory_Read" });
                var results = await discovery.GetEndpointsForUserAsync(user);

                Assert.Empty(results);

            }

            private class TestRbacConfigProvider : IRbacConfigProvider
            {
                public Task<RbacConfig> GetConfigAsync(System.Threading.CancellationToken cancellationToken = default)
                {
                    // Minimal config for test
                    var config = new RbacConfig(new List<RbacRoleConfig>
                    {
                        new RbacRoleConfig("IT_Write", "desc", new List<string>(), new List<string>{"mms175-update"}, "HIGH"),
                        new RbacRoleConfig("Inventory_Read", "desc", new List<string>(), new List<string>{"mms175-update"}, "LOW")
                    });
                    return Task.FromResult(config);
                }
    }
}
