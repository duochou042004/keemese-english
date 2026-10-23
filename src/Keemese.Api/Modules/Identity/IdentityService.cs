using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Infrastructure.Security;
using Keemese.Api.Modules.Identity.Domain;
using Keemese.Api.Shared.Errors;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Modules.Identity;

public sealed class IdentityService(
    AppDbContext db,
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    IPasswordHasher<AppUser> hasher,
    IConfiguration config,
    TimeProvider clock,
    ILogger<IdentityService> logger)
{
    public static readonly AppError InvalidCredentials = new("auth.invalid_credentials", StatusCodes.Status401Unauthorized);

    private static readonly AppUser DummyUser = new();
    private static string? s_dummyHash;

    /// <summary>FR-AUTH-AC1. Unknown user, wrong password and deactivated user all get the same error after one hash check.</summary>
    public async Task<AppError?> LoginAsync(LoginRequest request, HttpContext http, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(request.UserName) || string.IsNullOrEmpty(request.Password)) return InvalidCredentials;

        var user = await users.FindByNameAsync(request.UserName);
        if (user is null)
        {
            hasher.VerifyHashedPassword(DummyUser, s_dummyHash ??= hasher.HashPassword(DummyUser, "not-a-real-password"), request.Password);
            await AuditAsync("auth.login_failed", actor: null, target: null, http, ct);
            return InvalidCredentials;
        }

        var check = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false); // lockout: T-103
        if (!check.Succeeded || !user.IsActive)
        {
            await AuditAsync("auth.login_failed", actor: null, target: user.Id, http, ct);
            return InvalidCredentials;
        }

        var now = clock.GetUtcNow();
        user.LastLoginAt = now;
        await AuditAsync("auth.login_succeeded", actor: user.Id, target: user.Id, http, ct); // saves LastLoginAt too
        await signIn.SignInAsync(user, new AuthenticationProperties
        {
            IsPersistent = request.RememberMe,
            ExpiresUtc = request.RememberMe ? now.AddDays(30) : null, // otherwise the cookie's sliding 8 h
        });
        http.User = await signIn.CreateUserPrincipalAsync(user); // the XSRF token must belong to the new session
        AntiforgeryMiddleware.IssueToken(http);
        return null;
    }

    public async Task LogoutAsync(HttpContext http)
    {
        await signIn.SignOutAsync();
        http.User = new ClaimsPrincipal(new ClaimsIdentity());
        AntiforgeryMiddleware.IssueToken(http); // rotate: the old token belonged to the ended session
    }

    public async Task<MeDto?> GetMeAsync(Guid userId, HttpContext http, CancellationToken ct)
    {
        AntiforgeryMiddleware.IssueToken(http); // lets the SPA recover the token after a reload
        return await db.Users
            .Where(u => u.Id == userId)
            .Select(u => new MeDto(u.Id, u.Role, u.DisplayName, u.PreferredLanguage, u.MustChangePassword))
            .SingleOrDefaultAsync(ct);
    }

    /// <summary>FR-AUTH-03 / AC4: create the tutor from BOOTSTRAP_TUTOR_* only while none exists. No HTTP path.</summary>
    public async Task BootstrapTutorAsync(CancellationToken ct)
    {
        var userName = config["BOOTSTRAP_TUTOR_USERNAME"]?.Trim().ToLowerInvariant();
        var password = config["BOOTSTRAP_TUTOR_PASSWORD"];

        if (await db.Users.AnyAsync(u => u.Role == Roles.Tutor, ct))
        {
            if (!string.IsNullOrEmpty(userName) || !string.IsNullOrEmpty(password))
            {
                logger.LogWarning("tutor bootstrap: a tutor already exists, ignoring BOOTSTRAP_TUTOR_*; remove those variables");
            }
            return;
        }
        if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password)) return;

        var tutor = new AppUser { UserName = userName, Role = Roles.Tutor, DisplayName = userName, MustChangePassword = true };
        var result = await users.CreateAsync(tutor, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException("tutor bootstrap failed: " + string.Join(", ", result.Errors.Select(e => e.Code)));
        }
        logger.LogInformation("tutor bootstrap: created");
    }

    /// <summary>FR-AUTH-AC9 / T19, operator CLI only. Returns the new temporary password, or null when there is no tutor.</summary>
    public async Task<string?> ResetTutorPasswordAsync(CancellationToken ct)
    {
        var tutor = await db.Users.SingleOrDefaultAsync(u => u.Role == Roles.Tutor, ct);
        if (tutor is null) return null;

        var password = TemporaryPassword.New();
        tutor.PasswordHash = hasher.HashPassword(tutor, password);
        tutor.MustChangePassword = true;
        tutor.LockoutEnd = null;
        tutor.AccessFailedCount = 0;
        db.AuditEvents.Add(new AuditEvent { OccurredAt = clock.GetUtcNow(), Action = "auth.tutor_password_reset", TargetType = "user", TargetId = tutor.Id });
        // One save for the hash, the flags and the audit row; the new stamp ends every existing session.
        var result = await users.UpdateSecurityStampAsync(tutor);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException("tutor password reset failed: " + string.Join(", ", result.Errors.Select(e => e.Code)));
        }
        logger.LogWarning("tutor password reset via the operator CLI");
        return password;
    }

    private async Task AuditAsync(string action, Guid? actor, Guid? target, HttpContext http, CancellationToken ct)
    {
        db.AuditEvents.Add(new AuditEvent
        {
            OccurredAt = clock.GetUtcNow(),
            ActorUserId = actor,
            Action = action,
            TargetType = target is null ? null : "user",
            TargetId = target,
            IpHash = HashIp(http.Connection.RemoteIpAddress?.ToString()),
        });
        await db.SaveChangesAsync(ct);
    }

    private string? HashIp(string? ip) => ip is null
        ? null
        : Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(ip + config["Security:IpHashSalt"])));
}
