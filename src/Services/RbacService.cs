#nullable enable

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Implements: architecture/rbac-endpoint-control
public sealed class RbacService : IRbacService
{
    private readonly IRbacConfigProvider _configProvider;

    public RbacService(IRbacConfigProvider configProvider)
    {
        _configProvider = configProvider ?? throw new ArgumentNullException(nameof(configProvider));
    }

    public async Task<RbacResult> AuthorizeAsync(
        UserContext user,
        EndpointDefinition endpoint,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(endpoint.RequiredRole))
        {
            return new RbacResult(false, "Endpoint role not configured.", null, endpoint.RiskLevel);
        }

        var config = await _configProvider.GetConfigAsync(cancellationToken).ConfigureAwait(false);

        // Admin override
        if (user.Roles.Any(role => role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)))
        {
            return new RbacResult(true, "Admin override.", "ADMIN", endpoint.RiskLevel);
        }

        // Find role config
        var roleConfig = config.Roles.FirstOrDefault(r => r.Name.Equals(endpoint.RequiredRole, StringComparison.OrdinalIgnoreCase));
        if (roleConfig is null)
        {
            return new RbacResult(false, $"Role '{endpoint.RequiredRole}' not found in config.", null, endpoint.RiskLevel);
        }

        // Check if user has any mapped AD group or role
        var userHasRole = user.Roles.Any(role =>
            role.Equals(roleConfig.Name, StringComparison.OrdinalIgnoreCase) ||
            roleConfig.AdGroups.Any(ad => ad.Equals(role, StringComparison.OrdinalIgnoreCase)));

        if (!userHasRole)
        {
            return new RbacResult(false, "User does not have required role or AD group.", null, endpoint.RiskLevel);
        }

        // Check endpoint access
        if (!roleConfig.AllowedEndpoints.Contains(endpoint.Id, StringComparer.OrdinalIgnoreCase))
        {
            return new RbacResult(false, "Role not allowed for this endpoint.", roleConfig.Name, endpoint.RiskLevel);
        }

        // Check risk level
        if (!Enum.TryParse<RiskLevel>(roleConfig.MaxRiskLevel, true, out var maxRisk))
        {
            maxRisk = RiskLevel.Medium;
        }
        if (endpoint.RiskLevel > maxRisk)
        {
            return new RbacResult(false, $"Endpoint risk level '{endpoint.RiskLevel}' exceeds role max '{maxRisk}'.", roleConfig.Name, endpoint.RiskLevel);
        }

        return new RbacResult(true, "Access granted.", roleConfig.Name, endpoint.RiskLevel);
    }
}
