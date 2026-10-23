using System.Net;
using Microsoft.AspNetCore.Hosting;

namespace Keemese.IntegrationTests;

public sealed class SpaFallbackTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;
    private readonly string _webRoot = Directory.CreateTempSubdirectory("keemese-web-").FullName;

    public void Dispose()
    {
        Directory.Delete(_dataDir, recursive: true);
        Directory.Delete(_webRoot, recursive: true);
    }

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task SpaFallback_serves_index_for_client_routes_but_not_for_api_or_health()
    {
        await File.WriteAllTextAsync(Path.Combine(_webRoot, "index.html"), "<!doctype html><div id=root>", Ct);
        Directory.CreateDirectory(Path.Combine(_webRoot, "assets"));
        await File.WriteAllTextAsync(Path.Combine(_webRoot, "assets", "index-abc123.js"), "1", Ct);
        await using var factory = new KeemeseFactory(postgres.NewDatabase(), _dataDir);
        var client = factory.WithWebHostBuilder(b => b.UseWebRoot(_webRoot)).CreateClient();

        foreach (var path in new[] { "/", "/login", "/t/students/42", "/s" })
        {
            var page = await client.GetAsync(path, Ct);
            Assert.Equal(HttpStatusCode.OK, page.StatusCode);
            Assert.Equal("text/html", page.Content.Headers.ContentType?.MediaType);
            Assert.True(page.Headers.CacheControl?.NoCache, path);
        }

        var asset = await client.GetAsync("/assets/index-abc123.js", Ct);
        Assert.Equal(HttpStatusCode.OK, asset.StatusCode);
        Assert.Equal("public, max-age=31536000, immutable", asset.Headers.CacheControl?.ToString());

        foreach (var path in new[] { "/api/does-not-exist", "/api", "/health/nope", "/favicon.ico", "/assets/stale-123.js" })
        {
            var miss = await client.GetAsync(path, Ct);
            Assert.Equal(HttpStatusCode.NotFound, miss.StatusCode);
            Assert.Equal("application/problem+json", miss.Content.Headers.ContentType?.MediaType);
        }
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live", Ct)).StatusCode);

        // The SPA fallback answers GET only; anything else still hits the deny-by-default policy.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/login", null, Ct)).StatusCode);
    }
}
