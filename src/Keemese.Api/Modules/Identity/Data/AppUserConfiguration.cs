using Keemese.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Keemese.Api.Modules.Identity.Data;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.ToTable("users", t =>
        {
            t.HasCheckConstraint("ck_users_role", "role IN ('tutor', 'student')");
            t.HasCheckConstraint("ck_users_preferred_language", "preferred_language IN ('vi', 'en')");
        });
        builder.Property(u => u.Id).ValueGeneratedNever();
        builder.Property(u => u.DisplayName).HasMaxLength(120);
        // FR-AUTH-AC4 / T9: at most one tutor, enforced by the database.
        builder.HasIndex(u => u.Role).IsUnique().HasFilter("role = 'tutor'").HasDatabaseName("ux_users_single_tutor");
    }
}
