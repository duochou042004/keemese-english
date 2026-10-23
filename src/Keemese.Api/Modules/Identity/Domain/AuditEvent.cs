namespace Keemese.Api.Modules.Identity.Domain;

/// <summary>Append-only security log. IDs only: no usernames, secrets or answer content.</summary>
public sealed class AuditEvent
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public DateTimeOffset OccurredAt { get; init; }
    public Guid? ActorUserId { get; init; }
    public required string Action { get; init; }
    public string? TargetType { get; init; }
    public Guid? TargetId { get; init; }
    public string? IpHash { get; init; }
    public string? Details { get; init; } // jsonb
    public DateTimeOffset CreatedAt { get; set; }
}
