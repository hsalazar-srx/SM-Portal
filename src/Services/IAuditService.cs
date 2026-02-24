using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IAuditService
{
    Task<string> LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);
}
