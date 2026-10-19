using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(Keemese.IntegrationTests.PostgresFixture))]

namespace Keemese.IntegrationTests;

/// <summary>One PostgreSQL 18 container per test assembly (ADR-0013).</summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("docker.io/library/postgres:18.6-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public ValueTask InitializeAsync() => new(_container.StartAsync());

    public ValueTask DisposeAsync() => _container.DisposeAsync();
}
