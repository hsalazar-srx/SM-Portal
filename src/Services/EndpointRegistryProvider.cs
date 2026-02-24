using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

// Implements: architecture/endpoint-registry-provider
public sealed class EndpointRegistryProvider : IEndpointRegistryProvider
{
    public event EventHandler<EndpointRegistry>? RegistryChanged;

    private readonly string _registryPath;
    private readonly string? _schemaPath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private EndpointRegistry? _cache;

    public EndpointRegistryProvider(string registryPath, string? schemaPath = null)
    {
        _registryPath = registryPath;
        _schemaPath = schemaPath;
    }

    public Task<EndpointRegistry> LoadAsync(CancellationToken cancellationToken = default)
    {
        return LoadInternalAsync(cancellationToken);
    }

    public Task<EndpointRegistry> GetCurrentAsync(CancellationToken cancellationToken = default)
    {
        if (_cache is not null)
        {
            return Task.FromResult(_cache);
        }

        return LoadInternalAsync(cancellationToken);
    }

    private void OnRegistryChanged(EndpointRegistry registry)
    {
        RegistryChanged?.Invoke(this, registry);
    }

    private async Task<EndpointRegistry> LoadInternalAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var json = await File.ReadAllTextAsync(_registryPath, cancellationToken).ConfigureAwait(false);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var payload = JsonSerializer.Deserialize<RegistryPayload>(json, options)
                          ?? throw new InvalidDataException("Endpoint registry is empty or invalid JSON.");

            var endpoints = payload.Endpoints?.Select(ToEndpointDefinition).ToList()
                           ?? new List<EndpointDefinition>();

            Validate(endpoints);

            var registry = new EndpointRegistry(endpoints);
            _cache = registry;
            OnRegistryChanged(registry);
            return registry;
        }
        finally
        {
            _lock.Release();
        }
    }

    private static EndpointDefinition ToEndpointDefinition(EndpointPayload payload)
    {
        if (!Enum.TryParse<RiskLevel>(payload.RiskLevel ?? string.Empty, true, out var risk))
        {
            risk = RiskLevel.Medium;
        }

        var fields = payload.Fields?.Select(f => new EndpointField(
            f.Name ?? string.Empty,
            f.Description ?? string.Empty,
            f.Required ?? false,
            f.MaxLength,
            f.Type)).ToList() ?? new List<EndpointField>();

        return new EndpointDefinition(
            payload.Id ?? string.Empty,
            payload.Program ?? string.Empty,
            payload.Method ?? string.Empty,
            payload.DisplayName ?? string.Empty,
            payload.RequiredRole ?? string.Empty,
            risk,
            payload.Category,
            fields);
    }

    private static void Validate(IReadOnlyCollection<EndpointDefinition> endpoints)
    {
        var missing = endpoints.Where(e =>
            string.IsNullOrWhiteSpace(e.Id) ||
            string.IsNullOrWhiteSpace(e.Program) ||
            string.IsNullOrWhiteSpace(e.Method) ||
            string.IsNullOrWhiteSpace(e.DisplayName) ||
            string.IsNullOrWhiteSpace(e.RequiredRole)).ToList();

        if (missing.Count > 0)
        {
            throw new InvalidDataException("One or more endpoints are missing required fields.");
        }

        var duplicateIds = endpoints.GroupBy(e => e.Id, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateIds.Count > 0)
        {
            throw new InvalidDataException($"Duplicate endpoint IDs detected: {string.Join(", ", duplicateIds)}");
        }
    }

    private sealed class RegistryPayload
    {
        public List<EndpointPayload>? Endpoints { get; init; }
    }

    private sealed class EndpointPayload
    {
        public string? Id { get; init; }
        public string? Program { get; init; }
        public string? Method { get; init; }
        public string? DisplayName { get; init; }
        public string? RequiredRole { get; init; }
        public string? RiskLevel { get; init; }
        public string? Category { get; init; }
        public List<FieldPayload>? Fields { get; init; }
    }

    private sealed class FieldPayload
    {
        public string? Name { get; init; }
        public string? Description { get; init; }
        public bool? Required { get; init; }
        public int? MaxLength { get; init; }
        public string? Type { get; init; }
    }
}
