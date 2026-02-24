#nullable enable

using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

public interface IRbacConfigProvider
{
    Task<RbacConfig> GetConfigAsync(CancellationToken cancellationToken = default);
}

public sealed class RbacConfigProvider : IRbacConfigProvider
{
    private readonly string _configPath;
    private RbacConfig? _cache;

    public RbacConfigProvider(string configPath)
    {
        _configPath = configPath ?? throw new ArgumentNullException(nameof(configPath));
    }

    public async Task<RbacConfig> GetConfigAsync(CancellationToken cancellationToken = default)
    {
        if (_cache is not null)
            return _cache;

        await using var stream = File.OpenRead(_configPath);
        var config = await JsonSerializer.DeserializeAsync<RbacConfig>(stream, cancellationToken: cancellationToken);
        _cache = config ?? new RbacConfig(new List<RbacRoleConfig>());
        return _cache;
    }
}
