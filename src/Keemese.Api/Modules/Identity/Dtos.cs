namespace Keemese.Api.Modules.Identity;

public sealed record LoginRequest(string? UserName, string? Password, bool RememberMe);

public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

public sealed record PreferencesRequest(string? Language);

public sealed record MeDto(Guid Id, string Role, string DisplayName, string Language, bool MustChangePassword);
