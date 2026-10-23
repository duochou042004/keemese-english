using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Keemese.IntegrationTests;

/// <summary>Test helpers for signing in through the real API (invented credentials only).</summary>
public static class Auth
{
    public const string TutorUserName = "tutor";
    public const string TutorPassword = "invented-tutor-pass";

    /// <summary>The app with BOOTSTRAP_TUTOR_* set, so it creates the tutor on startup.</summary>
    public static WebApplicationFactory<Program> WithTutor(this WebApplicationFactory<Program> factory) =>
        factory.WithWebHostBuilder(b => b
            .UseSetting("BOOTSTRAP_TUTOR_USERNAME", TutorUserName)
            .UseSetting("BOOTSTRAP_TUTOR_PASSWORD", TutorPassword));

    /// <summary>HTTPS, because the session cookies are Secure outside Development.</summary>
    public static HttpClient CreateHttpsClient(this WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://keemese.test") });

    public static async Task<HttpResponseMessage> LoginAsync(this HttpClient client, string userName, string password, bool rememberMe = false)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { userName, password, rememberMe }, TestContext.Current.CancellationToken);
        if (response.StatusCode == HttpStatusCode.NoContent) client.UseXsrfToken(response);
        return response;
    }

    /// <summary>A signed-in tutor client that sends X-XSRF-TOKEN like the SPA does.</summary>
    public static async Task<HttpClient> AsTutor(this WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateHttpsClient();
        var response = await client.LoginAsync(TutorUserName, TutorPassword);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        return client;
    }

    public static void UseXsrfToken(this HttpClient client, HttpResponseMessage response)
    {
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", Uri.UnescapeDataString(SetCookie(response, "XSRF-TOKEN")!.Split(';')[0]["XSRF-TOKEN=".Length..]));
    }

    /// <summary>The raw Set-Cookie line for a cookie, attributes included.</summary>
    public static string? SetCookie(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues("Set-Cookie", out var values) ? values.LastOrDefault(v => v.StartsWith(name + "=", StringComparison.Ordinal)) : null;
}
