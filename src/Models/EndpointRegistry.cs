using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record EndpointRegistry(IReadOnlyList<EndpointDefinition> Endpoints);
