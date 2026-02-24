using System.Threading.Tasks;
using MovexPortal.Services;
using Xunit;

namespace MovexPortal.Tests;

public class EndpointRegistryProviderTests
{
    [Fact]
    public async Task LoadAsync_ShouldLoadRegistry()
    {
                var registryJson = """
                {
                    "endpoints": [
                        {
                            "id": "mms175-update",
                            "program": "MMS175MI",
                            "method": "Update",
                            "displayName": "Item Movement",
                            "requiredRole": "Inventory_Write",
                            "riskLevel": "HIGH",
                            "fields": []
                        }
                    ]
                }
                """;

                var path = System.IO.Path.GetTempFileName();
                await System.IO.File.WriteAllTextAsync(path, registryJson);

                var provider = new EndpointRegistryProvider(path);
                var registry = await provider.LoadAsync();

                Assert.Single(registry.Endpoints);
    }
}
