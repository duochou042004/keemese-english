using System.Net;
using Keemese.Api.Modules.Identity;

namespace Keemese.UnitTests;

public sealed class LoginRateLimiterTests
{
    [Theory]
    [InlineData("203.0.113.7", "203.0.113.7")]
    [InlineData("::ffff:203.0.113.7", "203.0.113.7")]
    [InlineData("2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:2::/64")]
    [InlineData("2001:db8:1:2::1", "2001:db8:1:2::/64")]
    public void IPv6_clients_share_a_partition_per_64(string ip, string expected) =>
        Assert.Equal(expected, LoginRateLimiter.IpKey(IPAddress.Parse(ip)));

    [Fact]
    public void The_sixth_attempt_from_one_64_is_refused()
    {
        using var limiter = new LoginRateLimiter();
        for (var i = 1; i <= 5; i++) Assert.True(limiter.AllowIp(IPAddress.Parse($"2001:db8::{i}")));
        Assert.False(limiter.AllowIp(IPAddress.Parse("2001:db8::6")));
        Assert.True(limiter.AllowIp(IPAddress.Parse("2001:db8:0:1::1")));
    }
}
