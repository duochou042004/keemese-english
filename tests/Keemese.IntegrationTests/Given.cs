using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Keemese.IntegrationTests;

/// <summary>Fixture builders that seed through the real API (testing strategy: invented data only).</summary>
public static class Given
{
    /// <summary>A student with invented tutor-only contact data, so isolation checks have private values to look for.</summary>
    public static StudentSeed Student(string fullName, string? userName = null) => new(fullName, userName ?? Slug(fullName));

    /// <summary>"Nguyễn Minh Anh" → "nguyen.minh.anh".</summary>
    private static string Slug(string fullName)
    {
        var plain = new StringBuilder();
        foreach (var c in fullName.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) plain.Append(c);
        }
        return plain.ToString().ToLowerInvariant().Replace(' ', '.');
    }
}

public sealed record StudentSeed(string FullName, string UserName)
{
    public string Phone => "0900-" + UserName;
    public string Zalo => "zalo-invented-" + UserName;
    public string ParentName => "Phụ huynh " + FullName;
    public string ParentContact => UserName + "-parent@example.test";
    public string ParentNotes => "invented parent note " + UserName;

    /// <summary>Every tutor-only value of this student, for "never shown to a student" assertions.</summary>
    public string[] PrivateValues => [Phone, Zalo, ParentName, ParentContact, ParentNotes];

    public async Task<CreatedStudent> CreateAsync(HttpClient tutor)
    {
        var response = await tutor.PostAsJsonAsync("/api/students", new
        {
            FullName,
            UserName,
            Phone,
            contactChannels = new[] { new { type = "zalo", value = Zalo } },
            parents = new[] { new { name = ParentName, relationship = "mother", contact = ParentContact, notes = ParentNotes } },
        }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return new CreatedStudent(body.GetProperty("id").GetGuid(), UserName, body.GetProperty("temporaryPassword").GetString()!, this);
    }
}

public sealed record CreatedStudent(Guid Id, string UserName, string TemporaryPassword, StudentSeed Seed)
{
    public const string ChangedPassword = "invented-student-pass";
}

public static class StudentAuth
{
    public const string ChangedTutorPassword = "invented-tutor-pass-2";

    /// <summary>
    /// The tutor, signed in with the bootstrap password changed (the gate blocks tutor routes until then).
    /// Call once per app: afterwards the tutor's password is <see cref="ChangedTutorPassword"/>.
    /// </summary>
    public static async Task<HttpClient> AsReadyTutor(this WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateHttpsClient().FromNewIp();
        Assert.Equal(HttpStatusCode.NoContent, (await client.LoginAsync(Auth.TutorUserName, Auth.TutorPassword)).StatusCode);
        var change = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Auth.TutorPassword, newPassword = ChangedTutorPassword }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        client.UseXsrfToken(change);
        return client;
    }

    /// <summary>A signed-in student; with <paramref name="changePassword"/> the first-login change is done (password becomes <see cref="CreatedStudent.ChangedPassword"/>).</summary>
    public static async Task<HttpClient> AsStudent(this WebApplicationFactory<Program> factory, CreatedStudent student, bool changePassword = true)
    {
        var client = factory.CreateHttpsClient().FromNewIp();
        Assert.Equal(HttpStatusCode.NoContent, (await client.LoginAsync(student.UserName, student.TemporaryPassword)).StatusCode);
        if (changePassword)
        {
            var change = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = student.TemporaryPassword, newPassword = CreatedStudent.ChangedPassword }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
            client.UseXsrfToken(change);
        }
        return client;
    }

    /// <summary>A fresh client IP (honoured only by apps built WithClientIps), so many logins in one test stay under the per-IP limit.</summary>
    public static HttpClient FromNewIp(this HttpClient client) =>
        client.FromIp($"10.{Random.Shared.Next(256)}.{Random.Shared.Next(256)}.{Random.Shared.Next(1, 255)}");
}
