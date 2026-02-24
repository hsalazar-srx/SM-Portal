#nullable enable

namespace MovexPortal.Models;

public sealed record EndpointField(
    string Name,
    string Description,
    bool Required,
    int? MaxLength,
    string? Type
);
