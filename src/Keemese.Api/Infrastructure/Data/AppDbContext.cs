using Keemese.Api.Modules.Identity.Domain;
using Keemese.Api.Modules.Students.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityUserContext<AppUser, Guid>(options)
{
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();

    /// <summary>public.f_unaccent from the Initial migration, for diacritics-insensitive search (database.md#conventions). LINQ only.</summary>
    public static string Unaccent(string text) => throw new NotSupportedException("Only usable inside a LINQ query.");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Identity's user tables
        modelBuilder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        modelBuilder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        modelBuilder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");
        modelBuilder.HasPostgresExtension("unaccent");
        modelBuilder.HasDbFunction(() => Unaccent("")).HasName("f_unaccent").HasSchema("public");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        // Cross-module FKs live here, so no module references another module's entities (ADR-0002).
        modelBuilder.Entity<StudentProfile>().HasOne<AppUser>().WithOne().HasForeignKey<StudentProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
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
