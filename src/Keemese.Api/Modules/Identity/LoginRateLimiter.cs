using System.Threading.RateLimiting;

namespace Keemese.Api.Modules.Identity;

/// <summary>
/// T1 / T19: login is limited to 5 per minute per client IP and 20 per hour per username. The service asks before
/// the password check, so rejected attempts never reach lockout. Not the RateLimiter middleware, because the
/// username partition needs the parsed body.
/// </summary>
public sealed class LoginRateLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<string> _perIp = FixedWindow(5, TimeSpan.FromMinutes(1));
    private readonly PartitionedRateLimiter<string> _perUserName = FixedWindow(20, TimeSpan.FromHours(1));

    /// <param name="ip">The client IP after forwarded headers (T-101); null shares one partition.</param>
    public bool AllowIp(string? ip) => Allow(_perIp, ip ?? "");

    public bool AllowUserName(string normalizedUserName) => Allow(_perUserName, normalizedUserName);

    public void Dispose()
    {
        _perIp.Dispose();
        _perUserName.Dispose();
    }

    private static bool Allow(PartitionedRateLimiter<string> limiter, string key)
    {
        using var lease = limiter.AttemptAcquire(key);
        return lease.IsAcquired;
    }

    private static PartitionedRateLimiter<string> FixedWindow(int permits, TimeSpan window) =>
        PartitionedRateLimiter.Create<string, string>(key => RateLimitPartition.GetFixedWindowLimiter(key, _ =>
            new FixedWindowRateLimiterOptions { PermitLimit = permits, Window = window, QueueLimit = 0 }));
}
