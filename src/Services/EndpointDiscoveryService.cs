using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Implements: architecture/endpoint-discovery-service
public sealed class EndpointDiscoveryService : IEndpointDiscoveryService
{
    private readonly IEndpointRegistryProvider _registryProvider;
    private readonly IRbacService _rbacService;

    public EndpointDiscoveryService(IEndpointRegistryProvider registryProvider, IRbacService rbacService)
    {
        _registryProvider = registryProvider;
        _rbacService = rbacService;
    }

    public Task<IReadOnlyList<EndpointDefinition>> GetEndpointsForUserAsync(
        UserContext user,
        RiskLevel? maxRiskLevel = null,
        CancellationToken cancellationToken = default)
    {
        return GetFilteredAsync(user, maxRiskLevel, cancellationToken);
    }

    private async Task<IReadOnlyList<EndpointDefinition>> GetFilteredAsync(
        UserContext user,
        RiskLevel? maxRiskLevel,
        CancellationToken cancellationToken)
    {
        var registry = await _registryProvider.GetCurrentAsync(cancellationToken).ConfigureAwait(false);
        var results = new List<EndpointDefinition>();

        foreach (var endpoint in registry.Endpoints)
        {
            if (maxRiskLevel.HasValue && endpoint.RiskLevel > maxRiskLevel.Value)
            {
                continue;
            }

            var auth = await _rbacService.AuthorizeAsync(user, endpoint, cancellationToken).ConfigureAwait(false);
            if (auth.Authorized)
            {
                results.Add(endpoint);
            }
        }

        return results;
    }
}
