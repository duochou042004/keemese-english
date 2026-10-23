using Keemese.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Keemese.Api.Modules.Identity.Data;

public sealed class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("audit_events");
        builder.Property(e => e.Id).ValueGeneratedNever();
        builder.Property(e => e.Action).HasMaxLength(64);
        builder.Property(e => e.TargetType).HasMaxLength(64);
        builder.Property(e => e.Details).HasColumnType("jsonb");
        builder.HasIndex(e => e.OccurredAt);
        builder.HasIndex(e => new { e.TargetType, e.TargetId });
    }
}
