namespace Keemese.Api.Modules.Students;

// Tutor DTOs only: nothing here is ever returned to a student (security model rule 3).

public sealed record ContactChannelDto(string? Type, string? Value);

public sealed record ParentDto(string? Name, string? Relationship, string? Contact, string? Notes);

public sealed record CreateStudentRequest(
    string? FullName,
    string? UserName,
    string? TemporaryPassword,
    string? Email,
    string? Phone,
    List<ContactChannelDto>? ContactChannels,
    List<ParentDto>? Parents);

/// <summary>A null field is left unchanged; an empty string or list clears it.</summary>
public sealed record UpdateStudentRequest(
    uint? Version,
    string? FullName,
    string? Email,
    string? Phone,
    List<ContactChannelDto>? ContactChannels,
    List<ParentDto>? Parents);

public sealed record DeleteStudentRequest(string? ConfirmName);

public sealed record CreatedStudentDto(Guid Id, string TemporaryPassword);

public sealed record TemporaryPasswordDto(string TemporaryPassword);

public sealed record PageDto<T>(IReadOnlyList<T> Items, int Total);

public sealed record StudentListItemDto(Guid Id, string FullName, string UserName, bool IsActive, bool MustChangePassword, DateTimeOffset? LastLoginAt);

public sealed record StudentDto(
    Guid Id,
    string FullName,
    string UserName,
    string? Email,
    string? Phone,
    IReadOnlyList<ContactChannelDto> ContactChannels,
    IReadOnlyList<ParentDto> Parents,
    bool IsActive,
    bool MustChangePassword,
    bool IsLockedOut,
    DateTimeOffset? LastLoginAt,
    DateTimeOffset CreatedAt,
    uint Version);
