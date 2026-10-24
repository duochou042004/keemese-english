using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Keemese.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Keemese.IntegrationTests;

/// <summary>T-103: FR-AUTH-05, AC2, AC5, AC6, FR-AUTH-08 and the T1/T19 rate limits. Each test gets its own database.</summary>
public sealed class PasswordLifecycleTests(PostgresFixture postgres) : IDisposable
{
    private const string NewPassword = "an-invented-new-pass";

    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private WebApplicationFactory<Program> NewApp() => new KeemeseFactory(postgres.NewDatabase(), _dataDir).WithTutor().WithClientIps();

    [Fact]
    public async Task Change_password_clears_the_flag_ends_other_sessions_and_keeps_this_one()
    {
        await using var app = NewApp();
        var caller = await app.AsTutor();
        var other = await app.AsTutor();

        var change = await caller.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Auth.TutorPassword, newPassword = NewPassword }, Ct);
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        Assert.NotNull(Auth.SetCookie(change, "__Host-keemese")); // re-issued with the new stamp
        caller.UseXsrfToken(change);

        var me = await caller.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct);
        Assert.False(me.GetProperty("mustChangePassword").GetBoolean());
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.GetAsync("/api/auth/me", Ct)).StatusCode); // FR-AUTH-AC6
        Assert.Equal(HttpStatusCode.NoContent, (await caller.PostAsync("/api/auth/logout", null, Ct)).StatusCode);

        var client = app.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.LoginAsync(Auth.TutorUserName, NewPassword)).StatusCode);
    }

    [Theory]
    [InlineData("not-the-password", NewPassword, HttpStatusCode.BadRequest, "auth.invalid_current_password", null)]
    [InlineData(Auth.TutorPassword, "too-short", HttpStatusCode.BadRequest, "validation.failed", "password.too_short")]
    [InlineData(Auth.TutorPassword, "QwertyUIOP", HttpStatusCode.BadRequest, "validation.failed", "password.too_common")]
    public async Task Change_password_rejects_a_wrong_current_or_a_weak_new_password(
        string current, string next, HttpStatusCode status, string code, string? fieldCode)
    {
        await using var app = NewApp();
        var client = await app.AsTutor();

        var response = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = current, newPassword = next }, Ct);
        Assert.Equal(status, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        Assert.Equal(code, problem.RootElement.GetProperty("code").GetString());
        if (fieldCode is not null)
        {
            Assert.Equal(fieldCode, problem.RootElement.GetProperty("errors").GetProperty("newPassword")[0].GetString());
        }

        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct);
        Assert.True(me.GetProperty("mustChangePassword").GetBoolean()); // nothing was saved
        Assert.Equal(HttpStatusCode.NoContent, (await app.CreateHttpsClient().LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
    }

    [Fact]
    public async Task The_gate_allows_only_me_change_password_and_logout_until_the_password_is_changed()
    {
        await using var app = NewApp();
        var client = await app.AsTutor(); // the bootstrapped tutor starts with mustChangePassword

        // An ordinary signed-in endpoint and a tutor-policy route (T-104) are both blocked.
        var blocked = await client.PutAsJsonAsync("/api/auth/preferences", new { language = "en" }, Ct);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        Assert.Equal("auth.password_change_required", await Code(blocked));
        Assert.Equal("auth.password_change_required", await Code(await client.GetAsync("/api/students", Ct)));

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", Ct)).StatusCode);
        var wrong = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "not-the-password", newPassword = NewPassword }, Ct);
        Assert.Equal("auth.invalid_current_password", await Code(wrong)); // reached the endpoint
        var change = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Auth.TutorPassword, newPassword = NewPassword }, Ct);
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        client.UseXsrfToken(change);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync("/api/auth/preferences", new { language = "en" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/students", Ct)).StatusCode); // the tutor route behind the gate (T-104)

        // The flag is read from the database on every request, so setting it again takes effect on the open session.
        using (var scope = app.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.ExecuteUpdateAsync(u => u.SetProperty(x => x.MustChangePassword, true), Ct);
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync("/api/auth/preferences", new { language = "vi" }, Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null, Ct)).StatusCode);
    }

    [Fact]
    public async Task Five_failures_lock_the_account_for_15_minutes_with_the_generic_error()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient();

        for (var i = 1; i <= 5; i++) // a different IP each time, so only the lockout applies
        {
            var failed = await client.FromIp($"10.0.0.{i}").LoginAsync(Auth.TutorUserName, "not-the-password");
            Assert.Equal("auth.invalid_credentials", await Code(failed));
        }
        DateTimeOffset lockoutEnd;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            lockoutEnd = (await db.Users.SingleAsync(Ct)).LockoutEnd!.Value;
            Assert.InRange(lockoutEnd - DateTimeOffset.UtcNow, TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(15));
            Assert.Equal(1, await db.AuditEvents.CountAsync(e => e.Action == "auth.locked_out", Ct));
        }

        // Locked: the right password gets the same generic error, and the attempt doesn't move the timer.
        var locked = await client.FromIp("10.0.0.6").LoginAsync(Auth.TutorUserName, Auth.TutorPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, locked.StatusCode);
        Assert.Equal("auth.invalid_credentials", await Code(locked));
        Assert.Null(Auth.SetCookie(locked, "__Host-keemese"));
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(lockoutEnd, (await db.Users.SingleAsync(Ct)).LockoutEnd);
            // 15 minutes later. Identity 10 reads the system clock for lockout (no TimeProvider), so move the stored end instead.
            await db.Users.ExecuteUpdateAsync(u => u.SetProperty(x => x.LockoutEnd, DateTimeOffset.UtcNow.AddSeconds(-1)), Ct);
        }

        Assert.Equal(HttpStatusCode.NoContent, (await client.FromIp("10.0.0.7").LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
    }

    [Fact]
    public async Task The_sixth_login_from_one_IP_in_a_minute_is_429_and_does_not_count_toward_lockout()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient().FromIp("10.0.1.1");

        for (var i = 0; i < 4; i++) await client.LoginAsync(Auth.TutorUserName, "not-the-password");
        await client.LoginAsync("nobody", "not-the-password");
        var limited = await client.LoginAsync(Auth.TutorUserName, "not-the-password");
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("auth.rate_limited", await Code(limited));

        using (var scope = app.Services.CreateScope())
        {
            var tutor = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.SingleAsync(Ct);
            Assert.Equal((4, null), (tutor.AccessFailedCount, tutor.LockoutEnd));
        }
        // Another IP is not affected.
        Assert.Equal(HttpStatusCode.NoContent, (await app.CreateHttpsClient().FromIp("10.0.1.2").LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
    }

    [Fact]
    public async Task The_21st_login_for_one_username_in_an_hour_is_429_and_oversized_fields_are_rejected()
    {
        await using var app = NewApp();
        var client = app.CreateHttpsClient();

        for (var i = 1; i <= 20; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.FromIp($"10.0.2.{i}").LoginAsync("Nobody", "not-the-password")).StatusCode);
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.FromIp("10.0.2.21").LoginAsync("nobody", "not-the-password")).StatusCode);

        var longName = await client.FromIp("10.0.2.22").LoginAsync(new string('a', 257), "not-the-password");
        Assert.Equal("auth.invalid_credentials", await Code(longName));
        var longPassword = await client.FromIp("10.0.2.23").LoginAsync(Auth.TutorUserName, new string('a', 257));
        Assert.Equal("auth.invalid_credentials", await Code(longPassword));
    }

    [Fact]
    public async Task Preferences_round_trip_through_me()
    {
        await using var app = NewApp();
        var client = await app.AsTutor();
        var change = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Auth.TutorPassword, newPassword = NewPassword }, Ct);
        client.UseXsrfToken(change);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync("/api/auth/preferences", new { language = "en" }, Ct)).StatusCode);
        Assert.Equal("en", (await client.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("language").GetString());

        var invalid = await client.PutAsJsonAsync("/api/auth/preferences", new { language = "fr" }, Ct);
        Assert.Equal("validation.failed", await Code(invalid));
        Assert.Equal("en", (await client.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("language").GetString());
    }

    private static async Task<string?> Code(HttpResponseMessage response)
    {
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        return problem.RootElement.GetProperty("code").GetString();
    }
}
