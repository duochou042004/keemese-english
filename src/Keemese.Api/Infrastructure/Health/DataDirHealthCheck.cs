using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Keemese.Api.Infrastructure.Health;

/// <summary>Healthy when DATA_DIR exists (or can be created) and a file can be written to it.</summary>
public sealed class DataDirHealthCheck(IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var dataDir = configuration["DATA_DIR"];
        if (string.IsNullOrWhiteSpace(dataDir)) return HealthCheckResult.Unhealthy("DATA_DIR is not configured.");
        try
        {
            Directory.CreateDirectory(dataDir);
            var probe = Path.Combine(dataDir, $".health-{Guid.NewGuid():N}");
            await File.WriteAllTextAsync(probe, "ok", cancellationToken);
            File.Delete(probe);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return HealthCheckResult.Unhealthy("DATA_DIR is not writable.");
        }
    }
}
