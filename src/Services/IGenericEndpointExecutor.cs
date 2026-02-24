using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IGenericEndpointExecutor
{
    Task<ExecutionResult> ExecuteAsync(
        EndpointDefinition endpoint,
        IReadOnlyDictionary<string, object> inputs,
        UserContext user,
        CancellationToken cancellationToken = default);
}
