using System.Collections.Generic;

namespace MovexPortal.Models;

public sealed record UserContext(
    string Identity,
    IReadOnlyList<string> Roles
);
