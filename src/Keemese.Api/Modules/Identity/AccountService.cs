using System.Text.RegularExpressions;
using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Infrastructure.Security;
using Keemese.Api.Modules.Identity.Contracts;
using Keemese.Api.Modules.Identity.Domain;
using Keemese.Api.Shared.Errors;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Keemese.Api.Modules.Identity;

public sealed partial class AccountService(
    AppDbContext db,
    UserManager<AppUser> users,
    IPasswordHasher<AppUser> hasher,
    ICurrentUser currentUser,
    TimeProvider clock) : IAccountService
{
    private static readonly AppError UserNameTaken = AppError.Validation("userName", "students.username_taken");

    public IQueryable<StudentAccount> Students => db.Users.Where(u => u.Role == Roles.Student).Select(u => new StudentAccount
    {
        Id = u.Id,
        UserName = u.UserName!,
        Email = u.Email,
        IsActive = u.IsActive,
        MustChangePassword = u.MustChangePassword,
        LockoutEnd = u.LockoutEnd,
        LastLoginAt = u.LastLoginAt,
    });

    public async Task<(NewAccount? Account, AppError? Error)> CreateStudentAsync(
        string? userName, string displayName, string? email, string? password, CancellationToken ct)
    {
        userName = userName?.Trim().ToLowerInvariant(); // backend conventions rule 7
        if (userName is null || !UserNamePattern().IsMatch(userName)) return (null, AppError.Validation("userName", "userName.invalid"));
        if (password is not null && PasswordPolicy.Check(password) is { } code) return (null, AppError.Validation("temporaryPassword", code));
        password ??= TemporaryPassword.New();

        var user = new AppUser { UserName = userName, Email = email, Role = Roles.Student, DisplayName = displayName, MustChangePassword = true };
        IdentityResult result;
        try
        {
            result = await users.CreateAsync(user, password);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "user_name_index" })
        {
            return (null, UserNameTaken); // lost a race with another create of the same name
        }
        if (!result.Succeeded)
        {
            return result.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.DuplicateUserName))
                ? (null, UserNameTaken)
                : throw new InvalidOperationException("student create failed: " + Codes(result));
        }
        await AuditAsync("student.created", user.Id, ct);
        return (new NewAccount(user.Id, password), null);
    }

    public async Task<bool> UpdateStudentAsync(Guid id, string displayName, string? email, CancellationToken ct)
    {
        if (await FindStudentAsync(id, ct) is not { } user) return false;
        user.DisplayName = displayName;
        user.Email = email;
        Check(await users.UpdateAsync(user)); // also refreshes the normalized email
        return true;
    }

    public async Task<string?> ResetPasswordAsync(Guid id, CancellationToken ct)
    {
        if (await FindStudentAsync(id, ct) is not { } user) return null;
        var password = TemporaryPassword.New();
        user.PasswordHash = hasher.HashPassword(user, password);
        user.MustChangePassword = true;
        user.LockoutEnd = null; // otherwise the new password would not work until the lockout ends
        user.AccessFailedCount = 0;
        Audit("student.password_reset", id);
        Check(await users.UpdateSecurityStampAsync(user)); // one save; the new stamp ends every open session
        return password;
    }

    public async Task<bool> SetActiveAsync(Guid id, bool active, CancellationToken ct)
    {
        if (await FindStudentAsync(id, ct) is not { } user) return false;
        user.IsActive = active; // restore keeps MustChangePassword as it was
        Audit(active ? "student.restored" : "student.archived", id);
        Check(await users.UpdateSecurityStampAsync(user));
        return true;
    }

    public async Task<bool> UnlockAsync(Guid id, CancellationToken ct)
    {
        if (await FindStudentAsync(id, ct) is not { } user) return false;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        Audit("student.unlocked", id);
        Check(await users.UpdateAsync(user));
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        if (await FindStudentAsync(id, ct) is not { } user) return false;
        Audit("student.deleted", id); // audit rows hold the ID only, so they outlive the user
        Check(await users.DeleteAsync(user));
        return true;
    }

    private Task<AppUser?> FindStudentAsync(Guid id, CancellationToken ct) =>
        db.Users.SingleOrDefaultAsync(u => u.Id == id && u.Role == Roles.Student, ct);

    // Saved by the UserManager call that follows, together with the change it records.
    private void Audit(string action, Guid target) => db.AuditEvents.Add(new AuditEvent
    {
        OccurredAt = clock.GetUtcNow(),
        ActorUserId = currentUser.UserId,
        Action = action,
        TargetType = "user",
        TargetId = target,
    });

    private async Task AuditAsync(string action, Guid target, CancellationToken ct)
    {
        Audit(action, target);
        await db.SaveChangesAsync(ct);
    }

    private static void Check(IdentityResult result)
    {
        if (!result.Succeeded) throw new InvalidOperationException("account update failed: " + Codes(result));
    }

    private static string Codes(IdentityResult result) => string.Join(", ", result.Errors.Select(e => e.Code));

    [GeneratedRegex("^[a-z0-9._-]{3,40}$")]
    private static partial Regex UserNamePattern();
}
