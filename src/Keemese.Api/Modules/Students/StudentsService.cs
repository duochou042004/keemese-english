using System.Net.Mail;
using System.Text.Json;
using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Modules.Identity.Contracts;
using Keemese.Api.Modules.Students.Domain;
using Keemese.Api.Shared.Errors;
using Microsoft.EntityFrameworkCore;

namespace Keemese.Api.Modules.Students;

/// <summary>FR-STU-01/02/03/05/06. Account state (login, active, lockout) belongs to Identity and is changed only through <see cref="IAccountService"/>.</summary>
public sealed class StudentsService(AppDbContext db, IAccountService accounts, TimeProvider clock)
{
    public static readonly AppError NotFound = new("common.not_found", StatusCodes.Status404NotFound);
    private static readonly AppError Conflict = new("concurrency.conflict", StatusCodes.Status409Conflict);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<(PageDto<StudentListItemDto>? Page, AppError? Error)> ListAsync(
        string? q, string? status, int? page, int? pageSize, CancellationToken ct)
    {
        if (status is not (null or "active" or "archived")) return (null, AppError.Validation("status", "status.unsupported"));
        var active = status != "archived";

        var query = from p in db.StudentProfiles
                    join a in accounts.Students on p.UserId equals a.Id
                    where a.IsActive == active
                    select new { Profile = p, Account = a };
        if (!string.IsNullOrWhiteSpace(q))
        {
            // FR-STU-AC3: f_unaccent(lower(...)) on both sides, so "nguyen" matches "Nguyễn".
            var pattern = "%" + EscapeLike(q.Trim().Normalize().ToLowerInvariant()) + "%";
            query = query.Where(x => EF.Functions.Like(AppDbContext.Unaccent(x.Profile.FullName.ToLower()), AppDbContext.Unaccent(pattern)));
        }

        var size = Math.Clamp(pageSize ?? 50, 1, 200);
        var skip = (Math.Clamp(page ?? 1, 1, 100_000) - 1) * size;
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(x => x.Profile.FullName).ThenBy(x => x.Profile.UserId)
            .Skip(skip).Take(size)
            .Select(x => new StudentListItemDto(x.Profile.UserId, x.Profile.FullName, x.Account.UserName, x.Account.IsActive, x.Account.MustChangePassword, x.Account.LastLoginAt))
            .ToListAsync(ct);
        return (new PageDto<StudentListItemDto>(items, total), null);
    }

    public async Task<StudentDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var row = await (from p in db.StudentProfiles.AsNoTracking()
                         join a in accounts.Students on p.UserId equals a.Id
                         where p.UserId == id
                         select new { Profile = p, Account = a }).SingleOrDefaultAsync(ct);
        return row is null ? null : ToDto(row.Profile, row.Account);
    }

    public async Task<(CreatedStudentDto? Created, AppError? Error)> CreateAsync(CreateStudentRequest request, CancellationToken ct)
    {
        var fullName = Clean(request.FullName) ?? "";
        var email = Clean(request.Email);
        var phone = Clean(request.Phone);
        var channels = request.ContactChannels ?? [];
        var parents = request.Parents ?? [];
        if (Validate(fullName, email, phone, channels, parents) is { } invalid) return (null, invalid);

        // The account and the profile are saved together or not at all (conventions rule 2).
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var password = string.IsNullOrEmpty(request.TemporaryPassword) ? null : request.TemporaryPassword;
        var (account, error) = await accounts.CreateStudentAsync(request.UserName, fullName, email, password, ct);
        if (error is not null) return (null, error);

        db.StudentProfiles.Add(new StudentProfile
        {
            UserId = account!.Id,
            FullName = fullName,
            Phone = phone,
            ContactChannels = JsonSerializer.Serialize(channels, Json),
            Parents = JsonSerializer.Serialize(parents, Json),
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return (new CreatedStudentDto(account.Id, account.TemporaryPassword), null);
    }

    /// <summary>FR-STU-02 / AC6: the edit applies only to the <c>version</c> it was made from.</summary>
    public async Task<(StudentDto? Student, AppError? Error)> UpdateAsync(Guid id, UpdateStudentRequest request, CancellationToken ct)
    {
        if (request.Version is not { } version) return (null, AppError.Validation("version", "version.required"));
        var profile = await db.StudentProfiles.SingleOrDefaultAsync(p => p.UserId == id, ct);
        var account = await accounts.Students.SingleOrDefaultAsync(a => a.Id == id, ct);
        if (profile is null || account is null) return (null, NotFound);

        var fullName = request.FullName is null ? profile.FullName : Clean(request.FullName) ?? "";
        var email = request.Email is null ? account.Email : Clean(request.Email);
        var phone = request.Phone is null ? profile.Phone : Clean(request.Phone);
        var channels = request.ContactChannels ?? Read<ContactChannelDto>(profile.ContactChannels);
        var parents = request.Parents ?? Read<ParentDto>(profile.Parents);
        if (Validate(fullName, email, phone, channels, parents) is { } invalid) return (null, invalid);

        db.Entry(profile).Property(p => p.Version).OriginalValue = version;
        profile.FullName = fullName;
        profile.Phone = phone;
        profile.ContactChannels = JsonSerializer.Serialize(channels, Json);
        profile.Parents = JsonSerializer.Serialize(parents, Json);
        db.Entry(profile).Property(p => p.UpdatedAt).IsModified = true; // an email-only edit still checks the version

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (null, Conflict);
        }
        await accounts.UpdateStudentAsync(id, fullName, email, ct); // users.display_name is what /api/auth/me shows
        await tx.CommitAsync(ct);
        return (await GetAsync(id, ct), null);
    }

    /// <summary>FR-STU-06: the typed name must match, then the account and every student-scoped row are removed.</summary>
    public async Task<AppError?> DeleteAsync(Guid id, DeleteStudentRequest request, CancellationToken ct)
    {
        var profile = await db.StudentProfiles.SingleOrDefaultAsync(p => p.UserId == id, ct);
        if (profile is null) return NotFound;
        if (Clean(request.ConfirmName) != profile.FullName) return AppError.Validation("confirmName", "students.confirm_name_mismatch");

        // shortcut: no stored files before M3; FR-STU-AC5's "files return 404" part lands with the files module (delete them after the commit).
        return await accounts.DeleteAsync(id, ct) ? null : NotFound;
    }

    private StudentDto ToDto(StudentProfile p, StudentAccount a) => new(
        p.UserId, p.FullName, a.UserName, a.Email, p.Phone,
        Read<ContactChannelDto>(p.ContactChannels), Read<ParentDto>(p.Parents),
        a.IsActive, a.MustChangePassword, a.LockoutEnd > clock.GetUtcNow(), a.LastLoginAt, p.CreatedAt, p.Version);

    private static AppError? Validate(string fullName, string? email, string? phone, List<ContactChannelDto> channels, List<ParentDto> parents)
    {
        if (fullName.Length == 0) return AppError.Validation("fullName", "fullName.required");
        if (fullName.Length > 120) return AppError.Validation("fullName", "fullName.too_long");
        if (email is not null && (email.Length > 256 || !MailAddress.TryCreate(email, out _))) return AppError.Validation("email", "email.invalid");
        if (phone?.Length > 40) return AppError.Validation("phone", "phone.too_long");
        if (channels.Count > 20 || channels.Any(c => c is null // JSON can still send a null element
             || !Fits(c.Type, 1, 40) || !Fits(c.Value, 1, 200)))
        {
            return AppError.Validation("contactChannels", "contactChannels.invalid");
        }
        if (parents.Count > 10 || parents.Any(p => p is null || !Fits(p.Name, 1, 120) || !Fits(p.Relationship, 0, 60)
            || !Fits(p.Contact, 0, 200) || !Fits(p.Notes, 0, 2000)))
        {
            return AppError.Validation("parents", "parents.invalid");
        }
        return null;

        static bool Fits(string? value, int min, int max) => (value?.Length ?? 0) is var length && length >= min && length <= max;
    }

    /// <summary>Trimmed and NFC-normalized (so a typed name compares and searches the same), or null when empty.</summary>
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().Normalize();

    private static List<T> Read<T>(string json) => JsonSerializer.Deserialize<List<T>>(json, Json) ?? [];

    private static string EscapeLike(string value) => value.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
}
