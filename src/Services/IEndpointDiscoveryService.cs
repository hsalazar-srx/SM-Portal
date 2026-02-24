using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IEndpointDiscoveryService
{
    Task<IReadOnlyList<EndpointDefinition>> GetEndpointsForUserAsync(
        UserContext user,
        RiskLevel? maxRiskLevel = null,
        CancellationToken cancellationToken = default);
}
