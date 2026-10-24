using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Keemese.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Keemese.IntegrationTests;

/// <summary>T-104: FR-STU-01/02/03/05/06, FR-AUTH-04/06/07, AUTH-AC6–AC9, STU-AC2/AC3/AC6. Each test gets its own database.</summary>
public sealed class StudentsTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private WebApplicationFactory<Program> NewApp() => new KeemeseFactory(postgres.NewDatabase(), _dataDir).WithTutor().WithClientIps();

    [Fact]
    public async Task Create_with_only_the_required_fields_returns_a_generated_password_once()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();

        var response = await tutor.PostAsJsonAsync("/api/students", new { fullName = "Lê Hoàng Nam", userName = " Hoang.Nam " }, Ct);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        var id = body.GetProperty("id").GetGuid();
        var password = body.GetProperty("temporaryPassword").GetString()!;
        Assert.Equal(12, password.Length);
        Assert.Equal($"/api/students/{id}", response.Headers.Location?.ToString());

        await using (var scope = app.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Id == id, Ct);
            Assert.Equal("hoang.nam", user.UserName); // trimmed and lowercased
            Assert.True(user.MustChangePassword); // FR-AUTH-04
            Assert.DoesNotContain(password, user.PasswordHash!);
            var audit = await db.AuditEvents.SingleAsync(e => e.Action == "student.created", Ct);
            Assert.Equal(id, audit.TargetId);
            Assert.NotNull(audit.ActorUserId);
            Assert.Null(audit.Details); // IDs only, never the password
            Assert.Equal("[]", (await db.StudentProfiles.SingleAsync(p => p.UserId == id, Ct)).Parents);
        }

        var student = app.CreateHttpsClient().FromNewIp();
        Assert.Equal(HttpStatusCode.NoContent, (await student.LoginAsync("HOANG.NAM", password)).StatusCode);
        var me = await student.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct);
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean());
        Assert.Equal("Lê Hoàng Nam", me.GetProperty("displayName").GetString());

        var detail = await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{id}", Ct);
        Assert.False(detail.TryGetProperty("temporaryPassword", out _)); // shown once, at creation
    }

    [Fact]
    public async Task Create_accepts_a_chosen_password_and_rejects_invalid_input_with_field_codes()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var created = await tutor.PostAsJsonAsync("/api/students", new { fullName = "Phạm Thu Hà", userName = "thu.ha", temporaryPassword = "an-invented-first-pass", email = "thu.ha@example.test" }, Ct);
        Assert.Equal("an-invented-first-pass", (await created.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("temporaryPassword").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await app.CreateHttpsClient().FromNewIp().LoginAsync("thu.ha", "an-invented-first-pass")).StatusCode);

        (object Body, string Field, string Code)[] cases =
        [
            (new { fullName = "Phạm Thu Hà", userName = "THU.HA" }, "userName", "students.username_taken"), // STU-AC2: case-insensitive
            (new { fullName = "Võ An", userName = "ab" }, "userName", "userName.invalid"),
            (new { fullName = "Võ An", userName = "vo an" }, "userName", "userName.invalid"),
            (new { fullName = "Võ An", userName = new string('a', 41) }, "userName", "userName.invalid"),
            (new { fullName = "Võ An", userName = "vo.an", temporaryPassword = "too-short" }, "temporaryPassword", "password.too_short"),
            (new { fullName = "Võ An", userName = "vo.an", temporaryPassword = "QwertyUIOP" }, "temporaryPassword", "password.too_common"),
            (new { fullName = "  ", userName = "vo.an" }, "fullName", "fullName.required"),
            (new { fullName = new string('A', 121), userName = "vo.an" }, "fullName", "fullName.too_long"),
            (new { fullName = "Võ An", userName = "vo.an", email = "not-an-email" }, "email", "email.invalid"),
            (new { fullName = "Võ An", userName = "vo.an", contactChannels = new[] { new { type = "zalo", value = "" } } }, "contactChannels", "contactChannels.invalid"),
            (new { fullName = "Võ An", userName = "vo.an", parents = new[] { new { name = "" } } }, "parents", "parents.invalid"),
        ];
        foreach (var (body, field, code) in cases)
        {
            var response = await tutor.PostAsJsonAsync("/api/students", body, Ct);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
            Assert.Equal("validation.failed", problem.GetProperty("code").GetString());
            Assert.Equal(code, problem.GetProperty("errors").GetProperty(field)[0].GetString());
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.StudentProfiles.CountAsync(Ct)); // nothing half-created
        Assert.Equal(2, await db.Users.CountAsync(Ct));
    }

    [Fact]
    public async Task List_search_ignores_diacritics_and_filters_by_status()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var anh = await Given.Student("Nguyễn Minh Anh").CreateAsync(tutor);
        await Given.Student("Trần Thị Bình").CreateAsync(tutor);
        await Given.Student("Nguyễn Văn Cường").CreateAsync(tutor);

        Assert.Equal(["Nguyễn Minh Anh", "Nguyễn Văn Cường"], await Names(tutor, "?q=nguyen")); // STU-AC3
        Assert.Equal(["Nguyễn Minh Anh", "Nguyễn Văn Cường"], await Names(tutor, "?q=NGUYỄN"));
        Assert.Equal(["Trần Thị Bình"], await Names(tutor, "?q=thi%20binh"));
        Assert.Equal(["Nguyễn Văn Cường"], await Names(tutor, "?q=" + Uri.EscapeDataString("Cuòng".Normalize(NormalizationForm.FormD))));
        Assert.Empty(await Names(tutor, "?q=%25")); // a literal %, not a wildcard
        Assert.Empty(await Names(tutor, "?q=_")); // unescaped, _ would match every name

        var page = await tutor.GetFromJsonAsync<JsonElement>("/api/students?pageSize=1&page=2", Ct);
        Assert.Equal(3, page.GetProperty("total").GetInt32());
        Assert.Equal("Nguyễn Văn Cường", page.GetProperty("items")[0].GetProperty("fullName").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await tutor.PostAsync($"/api/students/{anh.Id}/archive", null, Ct)).StatusCode);
        Assert.Equal(["Nguyễn Văn Cường", "Trần Thị Bình"], await Names(tutor, ""));
        Assert.Equal(["Nguyễn Minh Anh"], await Names(tutor, "?status=archived&q=anh"));
        Assert.Equal(HttpStatusCode.BadRequest, (await tutor.GetAsync("/api/students?status=deleted", Ct)).StatusCode);
    }

    [Fact]
    public async Task Patch_saves_with_optimistic_concurrency_and_rejects_a_stale_version()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var student = await Given.Student("Đặng Quốc Bảo").CreateAsync(tutor);
        var before = await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{student.Id}", Ct);
        Assert.Equal(student.Seed.Phone, before.GetProperty("phone").GetString());
        Assert.Equal(student.Seed.Zalo, before.GetProperty("contactChannels")[0].GetProperty("value").GetString());
        Assert.Equal(student.Seed.ParentName, before.GetProperty("parents")[0].GetProperty("name").GetString());
        var version = before.GetProperty("version").GetUInt32();

        var patch = await tutor.PatchAsJsonAsync($"/api/students/{student.Id}", new { version, fullName = "Đặng Quốc Bảo Anh", email = "bao@example.test", phone = "" }, Ct);
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var after = await patch.Content.ReadFromJsonAsync<JsonElement>(Ct);
        Assert.Equal("Đặng Quốc Bảo Anh", after.GetProperty("fullName").GetString());
        Assert.Equal("bao@example.test", after.GetProperty("email").GetString());
        Assert.Equal(JsonValueKind.Null, after.GetProperty("phone").ValueKind); // "" clears
        Assert.Equal(student.Seed.Zalo, after.GetProperty("contactChannels")[0].GetProperty("value").GetString()); // null leaves it
        Assert.NotEqual(version, after.GetProperty("version").GetUInt32());

        var stale = await tutor.PatchAsJsonAsync($"/api/students/{student.Id}", new { version, email = "" }, Ct); // STU-AC6
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Equal("concurrency.conflict", (await stale.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("code").GetString());
        Assert.Equal("bao@example.test", (await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{student.Id}", Ct)).GetProperty("email").GetString());

        var me = await (await app.AsStudent(student, changePassword: false)).GetFromJsonAsync<JsonElement>("/api/auth/me", Ct);
        Assert.Equal("Đặng Quốc Bảo Anh", me.GetProperty("displayName").GetString());

        var noVersion = await tutor.PatchAsJsonAsync($"/api/students/{student.Id}", new { phone = "1" }, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, noVersion.StatusCode);
    }

    [Fact]
    public async Task Archive_ends_the_open_session_and_restore_keeps_must_change_password()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var created = await Given.Student("Hồ Ngọc Mai").CreateAsync(tutor);
        var student = await app.AsStudent(created, changePassword: false);

        Assert.Equal(HttpStatusCode.NoContent, (await tutor.PostAsync($"/api/students/{created.Id}/archive", null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await student.GetAsync("/api/auth/me", Ct)).StatusCode); // AUTH-AC8
        var login = await app.CreateHttpsClient().FromNewIp().LoginAsync(created.UserName, created.TemporaryPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
        Assert.False((await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{created.Id}", Ct)).GetProperty("isActive").GetBoolean());

        Assert.Equal(HttpStatusCode.NoContent, (await tutor.PostAsync($"/api/students/{created.Id}/restore", null, Ct)).StatusCode);
        var again = await app.AsStudent(created, changePassword: false);
        Assert.True((await again.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("mustChangePassword").GetBoolean());

        Assert.Equal(["student.archived", "student.restored"], await AuditActions(app, created.Id));
    }

    [Fact]
    public async Task Reset_password_returns_a_new_temporary_password_and_ends_the_student_sessions()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var created = await Given.Student("Bùi Thanh Tâm").CreateAsync(tutor);
        var student = await app.AsStudent(created); // changed to CreatedStudent.ChangedPassword

        var reset = await tutor.PostAsync($"/api/students/{created.Id}/reset-password", null, Ct);
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        var password = (await reset.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("temporaryPassword").GetString()!;
        Assert.Equal(12, password.Length);

        Assert.Equal(HttpStatusCode.Unauthorized, (await student.GetAsync("/api/auth/me", Ct)).StatusCode); // AUTH-AC6
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateHttpsClient().FromNewIp().LoginAsync(created.UserName, CreatedStudent.ChangedPassword)).StatusCode);
        var again = await app.AsStudent(created with { TemporaryPassword = password }, changePassword: false);
        Assert.True((await again.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("mustChangePassword").GetBoolean());

        Assert.Equal(["student.password_reset"], await AuditActions(app, created.Id));
    }

    [Fact]
    public async Task Unlock_clears_a_lockout()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var created = await Given.Student("Lý Gia Huy").CreateAsync(tutor);
        await using (var scope = app.Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.Where(u => u.Id == created.Id)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.LockoutEnd, DateTimeOffset.UtcNow.AddMinutes(15)).SetProperty(x => x.AccessFailedCount, 5), Ct);
        }
        Assert.True((await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{created.Id}", Ct)).GetProperty("isLockedOut").GetBoolean());
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateHttpsClient().FromNewIp().LoginAsync(created.UserName, created.TemporaryPassword)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await tutor.PostAsync($"/api/students/{created.Id}/unlock", null, Ct)).StatusCode); // AUTH-AC9
        Assert.False((await tutor.GetFromJsonAsync<JsonElement>($"/api/students/{created.Id}", Ct)).GetProperty("isLockedOut").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, (await app.CreateHttpsClient().FromNewIp().LoginAsync(created.UserName, created.TemporaryPassword)).StatusCode);
        Assert.Equal(["student.unlocked"], await AuditActions(app, created.Id));
    }

    [Fact]
    public async Task Delete_requires_the_typed_name_and_removes_the_account_and_profile()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var created = await Given.Student("Ngô Thị Lan").CreateAsync(tutor);
        var student = await app.AsStudent(created);

        var wrong = await Delete(tutor, created.Id, "Ngo Thi Lan");
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal("students.confirm_name_mismatch", (await wrong.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("errors").GetProperty("confirmName")[0].GetString());

        // The same name typed in decomposed form (some keyboards) still matches.
        Assert.Equal(HttpStatusCode.NoContent, (await Delete(tutor, created.Id, " Ngô Thị Lan ".Normalize(NormalizationForm.FormD))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await tutor.GetAsync($"/api/students/{created.Id}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await student.GetAsync("/api/auth/me", Ct)).StatusCode);

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Users.AnyAsync(u => u.Id == created.Id, Ct));
        Assert.False(await db.StudentProfiles.AnyAsync(p => p.UserId == created.Id, Ct));
        Assert.Equal(["student.created", "student.deleted"], await AuditActions(app, created.Id, includeCreated: true));
    }

    [Fact]
    public async Task Unknown_ids_and_the_tutor_id_are_404_on_every_student_route()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        var tutorId = (await tutor.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("id").GetGuid();

        foreach (var id in new[] { Guid.CreateVersion7(), tutorId })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await tutor.GetAsync($"/api/students/{id}", Ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await tutor.PatchAsJsonAsync($"/api/students/{id}", new { version = 1 }, Ct)).StatusCode);
            foreach (var action in new[] { "archive", "restore", "reset-password", "unlock" })
            {
                Assert.Equal(HttpStatusCode.NotFound, (await tutor.PostAsync($"/api/students/{id}/{action}", null, Ct)).StatusCode);
            }
            Assert.Equal(HttpStatusCode.NotFound, (await Delete(tutor, id, Auth.TutorUserName)).StatusCode);
        }
        Assert.Equal(HttpStatusCode.NotFound, (await tutor.GetAsync("/api/students/not-a-guid", Ct)).StatusCode);
        Assert.True((await tutor.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("role").GetString() == "tutor"); // still active
    }

    [Fact]
    public async Task Unsafe_student_routes_need_the_antiforgery_header()
    {
        await using var app = NewApp();
        var tutor = await app.AsReadyTutor();
        tutor.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");

        var response = await tutor.PostAsJsonAsync("/api/students", new { fullName = "Võ An", userName = "vo.an" }, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("auth.antiforgery_failed", (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("code").GetString());
        Assert.Equal(0, (await tutor.GetFromJsonAsync<JsonElement>("/api/students", Ct)).GetProperty("total").GetInt32()); // nothing created
    }

    private static Task<HttpResponseMessage> Delete(HttpClient tutor, Guid id, string confirmName) =>
        tutor.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/students/{id}") { Content = JsonContent.Create(new { confirmName }) }, Ct);

    private static async Task<List<string>> Names(HttpClient tutor, string query)
    {
        var page = await tutor.GetFromJsonAsync<JsonElement>("/api/students" + query, Ct);
        return page.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("fullName").GetString()!).ToList();
    }

    private static async Task<List<string>> AuditActions(WebApplicationFactory<Program> app, Guid studentId, bool includeCreated = false)
    {
        await using var scope = app.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents
            .Where(e => e.TargetId == studentId && e.Action.StartsWith("student.") && (includeCreated || e.Action != "student.created"))
            .OrderBy(e => e.OccurredAt).ThenBy(e => e.Id).Select(e => e.Action).ToListAsync(Ct);
    }
}
