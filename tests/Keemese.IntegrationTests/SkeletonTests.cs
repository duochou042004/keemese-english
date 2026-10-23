using System.Net;
using System.Text.Json;
using Keemese.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Keemese.IntegrationTests;

public sealed class SkeletonTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Boots_against_empty_postgres_applies_migrations_and_is_ready()
    {
        await using var factory = new KeemeseFactory(postgres.NewDatabase(), _dataDir);
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/ready", Ct)).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync(Ct));
        var unaccented = await db.Database
            .SqlQuery<string>($"SELECT public.f_unaccent('Tiếng Việt') AS \"Value\"")
            .SingleAsync(Ct);
        Assert.Equal("Tieng Viet", unaccented);
    }

    [Fact]
    public async Task Ready_is_503_when_data_dir_is_not_writable()
    {
        var notADirectory = Path.Combine(_dataDir, "file");
        await File.WriteAllTextAsync(notADirectory, "x", Ct);
        await using var factory = new KeemeseFactory(postgres.NewDatabase(), notADirectory);
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/health/ready", Ct)).StatusCode);
    }

    [Fact]
    public async Task Unknown_api_path_is_404_problem_details()
    {
        await using var factory = new KeemeseFactory(postgres.NewDatabase(), _dataDir);
        var client = factory.CreateClient();

        var api = await client.GetAsync("/api/does-not-exist", Ct);
        Assert.Equal(HttpStatusCode.NotFound, api.StatusCode);
        Assert.Equal("application/problem+json", api.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(await api.Content.ReadAsStringAsync(Ct));
        Assert.Equal("common.not_found", problem.RootElement.GetProperty("code").GetString());
    }
}
