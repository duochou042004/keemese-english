using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Modules.Identity;
using Keemese.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Keemese.IntegrationTests;

/// <summary>T-102: FR-AUTH-AC1, AC3, AC4, AC9 and the ADR-0004 cookie/antiforgery rules. Each test gets its own database.</summary>
public sealed class IdentityTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private WebApplicationFactory<Program> NewApp(string? connectionString = null) =>
        new KeemeseFactory(connectionString ?? postgres.NewDatabase(), _dataDir).WithTutor();

    [Fact]
    public async Task Login_sets_the_session_cookie_per_ADR_0004_and_me_returns_the_profile()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient();

        var login = await client.LoginAsync(Auth.TutorUserName, Auth.TutorPassword);
        Assert.Equal(HttpStatusCode.NoContent, login.StatusCode);
        var session = Auth.SetCookie(login, "__Host-keemese")!;
        foreach (var flag in new[] { "path=/", "secure", "samesite=lax", "httponly" }) Assert.Contains(flag, session);
        Assert.DoesNotContain("expires=", session); // a browser-session cookie without "remember me"
        var xsrf = Auth.SetCookie(login, "XSRF-TOKEN")!;
        Assert.DoesNotContain("httponly", xsrf); // the SPA must read it

        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct);
        Assert.Equal("tutor", me.GetProperty("role").GetString());
        Assert.Equal("tutor", me.GetProperty("displayName").GetString());
        Assert.Equal("vi", me.GetProperty("language").GetString());
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean());

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tutor = await db.Users.SingleAsync(Ct);
        Assert.NotNull(tutor.LastLoginAt);
        Assert.Equal(7, tutor.Id.Version); // UUID v7
        var audit = await db.AuditEvents.SingleAsync(Ct);
        Assert.Equal(("auth.login_succeeded", tutor.Id), (audit.Action, audit.ActorUserId));

        var remembered = await app.CreateHttpsClient().LoginAsync(Auth.TutorUserName, Auth.TutorPassword, rememberMe: true);
        Assert.Contains("expires=", Auth.SetCookie(remembered, "__Host-keemese")!);
    }

    [Fact]
    public async Task Wrong_password_unknown_user_and_deactivated_user_get_the_same_error()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient();
        var session = await app.AsTutor();

        var wrong = await client.LoginAsync(Auth.TutorUserName, "not-the-password");
        var unknown = await client.LoginAsync("nobody", Auth.TutorPassword);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.ExecuteUpdateAsync(u => u.SetProperty(x => x.IsActive, false), Ct);
            Assert.Equal(2, await db.AuditEvents.CountAsync(e => e.Action == "auth.login_failed", Ct));
        }
        var deactivated = await client.LoginAsync(Auth.TutorUserName, Auth.TutorPassword);

        foreach (var response in new[] { wrong, unknown, deactivated })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Null(Auth.SetCookie(response, "__Host-keemese"));
            Assert.Equal("auth.invalid_credentials", await Code(response));
        }
        // Deactivation also ends the existing session on its next request.
        Assert.Equal(HttpStatusCode.Unauthorized, (await session.GetAsync("/api/auth/me", Ct)).StatusCode);
    }

    [Fact]
    public async Task Anonymous_me_is_401_and_sign_up_paths_are_404()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient();

        var me = await client.GetAsync("/api/auth/me", Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
        Assert.Equal("auth.unauthenticated", await Code(me));

        foreach (var path in new[] { "/api/auth/register", "/api/auth/signup", "/api/users" })
        {
            var signUp = await client.PostAsJsonAsync(path, new { userName = "x", password = Auth.TutorPassword }, Ct);
            Assert.Equal(HttpStatusCode.NotFound, signUp.StatusCode);
        }
    }

    [Fact]
    public async Task Unsafe_requests_need_the_xsrf_header_and_logout_ends_the_session()
    {
        await using var app = NewApp();
        var client = await app.AsTutor();
        var token = client.DefaultRequestHeaders.GetValues("X-XSRF-TOKEN").Single();

        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        var noToken = await client.PostAsync("/api/auth/logout", null, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, noToken.StatusCode);
        Assert.Equal("auth.antiforgery_failed", await Code(noToken));
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", "forged");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/auth/logout", null, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", Ct)).StatusCode); // still signed in

        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
        var logout = await client.PostAsync("/api/auth/logout", null, Ct);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.NotNull(Auth.SetCookie(logout, "XSRF-TOKEN")); // rotated
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me", Ct)).StatusCode);
    }

    [Fact]
    public async Task An_xsrf_token_works_only_for_its_own_session_and_login_accepts_only_json()
    {
        await using var app = NewApp();
        var a = await app.AsTutor();
        var b = await app.AsTutor();
        b.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        b.DefaultRequestHeaders.Add("X-XSRF-TOKEN", a.DefaultRequestHeaders.GetValues("X-XSRF-TOKEN").Single());
        Assert.Equal(HttpStatusCode.BadRequest, (await b.PostAsync("/api/auth/logout", null, Ct)).StatusCode);

        // Login is anonymous, so no XSRF check: a cross-site form post must fail on the content type instead (no CORS).
        var form = new StringContent($"userName={Auth.TutorUserName}&password={Auth.TutorPassword}", System.Text.Encoding.UTF8, "application/x-www-form-urlencoded");
        var text = new StringContent($$"""{"userName":"{{Auth.TutorUserName}}","password":"{{Auth.TutorPassword}}"}""", System.Text.Encoding.UTF8, "text/plain");
        foreach (var body in new HttpContent[] { form, text })
        {
            var login = await app.CreateHttpsClient().PostAsync("/api/auth/login", body, Ct);
            Assert.NotEqual(HttpStatusCode.NoContent, login.StatusCode); // 404: no endpoint matches a non-JSON body
            Assert.Null(Auth.SetCookie(login, "__Host-keemese"));
        }
    }

    [Fact]
    public async Task Bootstrap_creates_one_tutor_and_the_database_rejects_a_second()
    {
        var database = postgres.NewDatabase();
        await using (var first = NewApp(database)) _ = first.Services; // starts: creates the tutor
        await using var second = new KeemeseFactory(database, _dataDir).WithWebHostBuilder(b => b
            .UseSetting("BOOTSTRAP_TUTOR_USERNAME", "other-tutor")
            .UseSetting("BOOTSTRAP_TUTOR_PASSWORD", "invented-other-pass"));

        using var scope = second.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tutor = await db.Users.SingleAsync(u => u.Role == Roles.Tutor, Ct);
        Assert.Equal(Auth.TutorUserName, tutor.UserName);

        db.Users.Add(new AppUser { UserName = "second", NormalizedUserName = "SECOND", Role = Roles.Tutor, DisplayName = "second" });
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(Ct));
        Assert.Equal("ux_users_single_tutor", Assert.IsType<PostgresException>(error.InnerException).ConstraintName);
    }

    [Fact]
    public async Task The_operator_reset_sets_a_temporary_password_clears_lockout_and_ends_sessions()
    {
        await using var app = NewApp();
        var oldSession = await app.AsTutor();
        string password;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.ExecuteUpdateAsync(u => u
                .SetProperty(x => x.LockoutEnd, DateTimeOffset.UtcNow.AddHours(1))
                .SetProperty(x => x.AccessFailedCount, 5)
                .SetProperty(x => x.MustChangePassword, false), Ct);
            password = (await scope.ServiceProvider.GetRequiredService<IdentityService>().ResetTutorPasswordAsync(Ct))!;
        }

        Assert.Equal(TemporaryPassword.Length, password.Length);
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetAsync("/api/auth/me", Ct)).StatusCode);
        var client = app.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.LoginAsync(Auth.TutorUserName, password)).StatusCode);

        using var check = app.Services.CreateScope();
        var tutor = await check.ServiceProvider.GetRequiredService<AppDbContext>().Users.SingleAsync(Ct);
        Assert.Equal((null, 0, true), (tutor.LockoutEnd, tutor.AccessFailedCount, tutor.MustChangePassword));
        Assert.True(await check.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents
            .AnyAsync(e => e.Action == "auth.tutor_password_reset" && e.TargetId == tutor.Id, Ct));
    }

    private static async Task<string?> Code(HttpResponseMessage response)
    {
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        return problem.RootElement.GetProperty("code").GetString();
    }
}
