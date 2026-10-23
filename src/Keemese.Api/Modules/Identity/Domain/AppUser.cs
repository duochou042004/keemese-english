using Microsoft.AspNetCore.Identity;

namespace Keemese.Api.Modules.Identity.Domain;

public static class Roles
{
    public const string Tutor = "tutor";
    public const string Student = "student";
}

public sealed class AppUser : IdentityUser<Guid>
{
    public AppUser() => Id = Guid.CreateVersion7();

    public string Role { get; set; } = Roles.Student;
    public string DisplayName { get; set; } = "";
    public string PreferredLanguage { get; set; } = "vi";
    public bool MustChangePassword { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
