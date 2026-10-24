namespace Keemese.Api.Modules.Students.Domain;

/// <summary>The tutor-only profile of a student account (database.md#students). The learning-profile columns arrive in M2.</summary>
public sealed class StudentProfile
{
    public Guid UserId { get; init; }
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public string ContactChannels { get; set; } = "[]"; // jsonb [{type, value}]
    public string Parents { get; set; } = "[]"; // jsonb [{name, relationship, contact, notes}]
    public uint Version { get; set; } // xmin
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
