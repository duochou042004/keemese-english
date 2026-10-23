namespace Keemese.Api.Modules.Identity;

public sealed record LoginRequest(string? UserName, string? Password, bool RememberMe);

public sealed record MeDto(Guid Id, string Role, string DisplayName, string Language, bool MustChangePassword);
