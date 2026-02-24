using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IRbacService
{
    Task<RbacResult> AuthorizeAsync(
        UserContext user,
        EndpointDefinition endpoint,
        CancellationToken cancellationToken = default);
}
