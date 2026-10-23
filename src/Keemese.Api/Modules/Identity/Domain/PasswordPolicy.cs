using System.Collections.Frozen;
using Microsoft.AspNetCore.Identity;

namespace Keemese.Api.Modules.Identity.Domain;

/// <summary>
/// security-model.md#authentication: at least 10 characters, no composition rules, not a common password.
/// The only password validator, so Identity's create/change/reset all report these codes (T-104 reuses it).
/// </summary>
public sealed class PasswordPolicy : IPasswordValidator<AppUser>
{
    public const int MinLength = 10;
    public const int MaxLength = 256; // bounds the PBKDF2 input
    public const string TooShort = "password.too_short";
    public const string TooLong = "password.too_long";
    public const string TooCommon = "password.too_common";

    private static readonly FrozenSet<string> Common = LoadCommon();

    /// <summary>The first rule the password breaks, or null when it is acceptable.</summary>
    public static string? Check(string? password) =>
        password is null || password.Length < MinLength ? TooShort
        : password.Length > MaxLength ? TooLong
        : Common.Contains(password.ToLowerInvariant()) ? TooCommon
        : null;

    public Task<IdentityResult> ValidateAsync(UserManager<AppUser> manager, AppUser user, string? password) =>
        Task.FromResult(Check(password) is { } code
            ? IdentityResult.Failed(new IdentityError { Code = code, Description = code })
            : IdentityResult.Success);

    private static FrozenSet<string> LoadCommon()
    {
        using var stream = typeof(PasswordPolicy).Assembly.GetManifestResourceStream("Keemese.Api.common-passwords.txt")
            ?? throw new InvalidOperationException("The common-password list is not embedded.");
        using var reader = new StreamReader(stream);
        var lines = new List<string>();
        while (reader.ReadLine() is { } line)
        {
            if (line.Length > 0 && !line.StartsWith('#')) lines.Add(line);
        }
        return lines.ToFrozenSet(StringComparer.Ordinal);
    }
}
