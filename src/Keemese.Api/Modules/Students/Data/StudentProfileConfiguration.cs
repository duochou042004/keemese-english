using Keemese.Api.Modules.Students.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Keemese.Api.Modules.Students.Data;

public sealed class StudentProfileConfiguration : IEntityTypeConfiguration<StudentProfile>
{
    public void Configure(EntityTypeBuilder<StudentProfile> builder)
    {
        builder.ToTable("student_profiles");
        builder.HasKey(p => p.UserId); // the FK to users is configured in AppDbContext (it crosses modules)
        builder.Property(p => p.UserId).ValueGeneratedNever();
        builder.Property(p => p.FullName).HasMaxLength(120);
        builder.Property(p => p.Phone).HasMaxLength(40);
        builder.Property(p => p.ContactChannels).HasColumnType("jsonb");
        builder.Property(p => p.Parents).HasColumnType("jsonb");
        builder.Property(p => p.Version).IsRowVersion().HasColumnName("xmin").HasColumnType("xid"); // a system column, never created
    }
}
