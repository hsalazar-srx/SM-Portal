using System;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IEndpointRegistryProvider
{
    event EventHandler<EndpointRegistry>? RegistryChanged;

    Task<EndpointRegistry> LoadAsync(CancellationToken cancellationToken = default);
    Task<EndpointRegistry> GetCurrentAsync(CancellationToken cancellationToken = default);
}
