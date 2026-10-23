using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Keemese.IntegrationTests;

public sealed class PipelineTests(PostgresFixture postgres) : IDisposable
{
    // A copy of docs/security/security-model.md#web-security-headers-app, so a change to the code alone fails here.
    private const string Csp =
        "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

    // Every endpoint allowed without a login. Adding one here needs a security review.
    private static readonly HashSet<string> AnonymousAllowlist =
    [
        "/health/live",
        "/health/ready",
        "/api/{**path}",
        "/health/{**path}",
        "{**path:file}",
        "{*path:nonfile}", // the SPA fallback (MapFallbackToFile)
        "/openapi/{documentName}.json", // Development only
    ];

    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;
    private readonly string _webRoot = Directory.CreateTempSubdirectory("keemese-web-").FullName;

    public void Dispose()
    {
        Directory.Delete(_dataDir, recursive: true);
        Directory.Delete(_webRoot, recursive: true);
    }

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Security_headers_are_on_spa_api_and_health_responses()
    {
        await File.WriteAllTextAsync(Path.Combine(_webRoot, "index.html"), "<!doctype html><div id=root>", Ct);
        await using var factory = new KeemeseFactory(postgres.ConnectionString, _dataDir);
        var client = factory.WithWebHostBuilder(b => b.UseWebRoot(_webRoot))
            .CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://keemese.test") });

        foreach (var path in new[] { "/login", "/api/nope", "/health/live", "/favicon.ico" })
        {
            var response = await client.GetAsync(path, Ct);
            Assert.Equal(Csp, Header(response, "Content-Security-Policy"));
            Assert.Equal("nosniff", Header(response, "X-Content-Type-Options"));
            Assert.Equal("strict-origin-when-cross-origin", Header(response, "Referrer-Policy"));
            Assert.Equal("camera=(), geolocation=(), microphone=()", Header(response, "Permissions-Policy"));
            Assert.False(response.Headers.Contains("Strict-Transport-Security"), $"{path}: no HSTS in Testing");
        }

        var api = await client.GetAsync("/api/nope", Ct);
        Assert.Equal(HttpStatusCode.NotFound, api.StatusCode);
        Assert.Equal("private, no-store", Header(api, "Cache-Control"));
        Assert.True((await client.GetAsync("/login", Ct)).Headers.CacheControl?.NoCache, "SPA cache headers unchanged");
    }

    [Fact]
    public async Task Production_sends_hsts_and_trusts_forwarded_proto_only_from_configured_proxies()
    {
        await using var factory = new KeemeseFactory(postgres.ConnectionString, _dataDir, "Production");
        var server = factory.WithWebHostBuilder(b => b
            .UseSetting("ForwardedHeaders:KnownProxies", "10.0.0.5")
            .UseSetting("https_port", "443")).Server;

        var https = await server.CreateClient().SendAsync(new HttpRequestMessage(HttpMethod.Get, "https://keemese.test/health/live"), Ct);
        Assert.Equal(HttpStatusCode.OK, https.StatusCode);
        Assert.Equal("max-age=15552000", Header(https, "Strict-Transport-Security")); // 180 days, no preload

        var spoofed = await ViaProxy(server, "203.0.113.9");
        Assert.Equal(StatusCodes.Status307TemporaryRedirect, spoofed.Response.StatusCode);
        Assert.Equal("https://keemese.test/health/live", spoofed.Response.Headers.Location.ToString());
        Assert.Equal(Csp, spoofed.Response.Headers.ContentSecurityPolicy.ToString()); // the redirect carries the headers too
        Assert.Equal("203.0.113.9", spoofed.Connection.RemoteIpAddress?.ToString());

        var proxied = await ViaProxy(server, "10.0.0.5");
        Assert.Equal(StatusCodes.Status200OK, proxied.Response.StatusCode);
        Assert.Equal("max-age=15552000", proxied.Response.Headers.StrictTransportSecurity.ToString());
        Assert.Equal("198.51.100.7", proxied.Connection.RemoteIpAddress?.ToString()); // X-Forwarded-For honoured
    }

    [Fact]
    public async Task Without_configured_proxies_forwarded_headers_are_ignored()
    {
        await using var factory = new KeemeseFactory(postgres.ConnectionString, _dataDir, "Production");
        var server = factory.WithWebHostBuilder(b => b.UseSetting("https_port", "443")).Server;

        foreach (var remoteIp in new[] { "203.0.113.9", "127.0.0.1" }) // loopback is not trusted by default either
        {
            var spoofed = await ViaProxy(server, remoteIp);
            Assert.Equal(StatusCodes.Status307TemporaryRedirect, spoofed.Response.StatusCode);
            Assert.Equal(remoteIp, spoofed.Connection.RemoteIpAddress?.ToString());
        }
    }

    [Fact]
    public async Task A_malformed_proxy_address_fails_startup() // the middleware reads its options while the pipeline is built
    {
        await using var factory = new KeemeseFactory(postgres.ConnectionString, _dataDir, "Production");
        var bad = factory.WithWebHostBuilder(b => b.UseSetting("ForwardedHeaders:KnownProxies", "not-an-ip"));
        Assert.Throws<FormatException>(() => bad.CreateClient());
    }

    [Fact]
    public async Task Every_endpoint_has_an_authorization_policy_or_is_an_allowlisted_anonymous_endpoint()
    {
        await using var factory = new KeemeseFactory(postgres.ConnectionString, _dataDir);
        var endpoints = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints;
        Assert.NotEmpty(endpoints);

        foreach (var endpoint in endpoints)
        {
            var route = (endpoint as RouteEndpoint)?.RoutePattern.RawText ?? endpoint.DisplayName;
            if (endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                Assert.True(AnonymousAllowlist.Contains(route ?? ""), $"Anonymous endpoint not on the allowlist: {route}");
            }
            else
            {
                Assert.True(endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Any()
                    || endpoint.Metadata.GetMetadata<AuthorizationPolicy>() is not null,
                    $"Endpoint without an explicit authorization decision: {route}");
            }
        }
    }

    // A plain-http request with the X-Forwarded-* headers a TLS proxy would send.
    private static Task<HttpContext> ViaProxy(TestServer server, string remoteIp) => server.SendAsync(ctx =>
    {
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        ctx.Request.Scheme = "http";
        ctx.Request.Host = new HostString("keemese.test");
        ctx.Request.Path = "/health/live";
        ctx.Request.Headers["X-Forwarded-Proto"] = "https";
        ctx.Request.Headers["X-Forwarded-For"] = "198.51.100.7";
    }, Ct);

    // The raw value as sent; the typed accessors re-serialize (Cache-Control comes back reordered).
    private static string? Header(HttpResponseMessage response, string name) =>
        response.Headers.NonValidated.TryGetValues(name, out var values) || response.Content.Headers.NonValidated.TryGetValues(name, out values)
            ? values.ToString()
            : null;
}
