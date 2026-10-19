using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("unaccent");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplySnakeCaseNames(modelBuilder);
    }

    // shortcut: hand-rolled snake_case (no owned or complex types); use EFCore.NamingConventions (needs approval) if those appear.
    private static void ApplySnakeCaseNames(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            if (entity.GetTableName() is { } table) entity.SetTableName(SnakeCase.From(table));
            foreach (var property in entity.GetProperties()) property.SetColumnName(SnakeCase.From(property.GetColumnName()));
            foreach (var key in entity.GetKeys()) key.SetName(SnakeCase.From(key.GetName()!));
            foreach (var fk in entity.GetForeignKeys()) fk.SetConstraintName(SnakeCase.From(fk.GetConstraintName()!));
            foreach (var index in entity.GetIndexes()) index.SetDatabaseName(SnakeCase.From(index.GetDatabaseName()!));
        }
    }
}
