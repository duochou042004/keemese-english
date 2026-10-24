using Keemese.Api.Shared.Errors;

namespace Keemese.Api.Modules.Identity.Contracts;

/// <summary>
/// The student account actions other modules may take (ADR-0002: Students reaches Identity only through this).
/// Every method acts on student accounts only: a tutor or unknown ID is a miss (false / null). Each action writes
/// its audit event with the signed-in tutor as the actor.
/// </summary>
public interface IAccountService
{
    /// <summary>Student accounts, for joining with profiles in one query.</summary>
    IQueryable<StudentAccount> Students { get; }

    /// <summary>FR-STU-01 / FR-AUTH-04. A null password is generated. The password is returned once and never stored in plain text.</summary>
    Task<(NewAccount? Account, AppError? Error)> CreateStudentAsync(string? userName, string displayName, string? email, string? password, CancellationToken ct);

    Task<bool> UpdateStudentAsync(Guid id, string displayName, string? email, CancellationToken ct);

    /// <summary>FR-AUTH-06 / AC6 / AC7: a new temporary password (returned once), must-change set, lockout cleared, other sessions ended.</summary>
    Task<string?> ResetPasswordAsync(Guid id, CancellationToken ct);

    /// <summary>FR-AUTH-07 / AC8: deactivating rotates the stamp, so open sessions end on their next request.</summary>
    Task<bool> SetActiveAsync(Guid id, bool active, CancellationToken ct);

    /// <summary>FR-AUTH-AC9.</summary>
    Task<bool> UnlockAsync(Guid id, CancellationToken ct);

    /// <summary>FR-STU-06: removes the user row; student-scoped rows go with it by cascade.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
}

/// <summary>A class with init properties, so EF can translate filters on a projection of it.</summary>
public sealed class StudentAccount
{
    public Guid Id { get; init; }
    public string UserName { get; init; } = "";
    public string? Email { get; init; }
    public bool IsActive { get; init; }
    public bool MustChangePassword { get; init; }
    public DateTimeOffset? LockoutEnd { get; init; }
    public DateTimeOffset? LastLoginAt { get; init; }
}

public sealed record NewAccount(Guid Id, string TemporaryPassword);
