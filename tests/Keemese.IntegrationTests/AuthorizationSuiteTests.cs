using System.Net;
using System.Text.Json;
using Keemese.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Keemese.IntegrationTests;

/// <summary>
/// T8 / testing strategy#isolation-suite step 4, over every discovered endpoint: a student gets 403 on every tutor
/// endpoint, and nothing outside the anonymous allowlist answers a caller without a cookie.
/// </summary>
public sealed class AuthorizationSuiteTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Students_get_403_on_tutor_endpoints_and_anonymous_callers_get_401_everywhere_else()
    {
        await using var app = new KeemeseFactory(postgres.NewDatabase(), _dataDir).WithTutor().WithClientIps();
        var tutor = await app.AsReadyTutor();
        var created = await Given.Student("Nguyễn Minh Anh").CreateAsync(tutor);
        var student = await app.AsStudent(created); // password changed, so a 403 is the policy, not the gate
        var anonymous = app.CreateHttpsClient();

        // Route values: a real student ID, so a missing policy would show up as 2xx instead of hiding behind a 404.
        var values = new Dictionary<string, string> { ["id"] = created.Id.ToString() };
        var routes = Routes.Discover(app);
        var tutorRoutes = routes.Where(r => r.Policies.Contains(Policies.Tutor)).ToList();
        Assert.Contains(tutorRoutes, r => r.Template == "/api/students/"); // MapGroup + "" keeps the trailing slash in RawText

        // Skipping anonymous routes below is safe only because each one is on the reviewed allowlist.
        Assert.All(routes.Where(r => r.Anonymous), r => Assert.Contains(r.Template, PipelineTests.AnonymousAllowlist));

        foreach (var route in routes.Where(r => !r.Anonymous))
        {
            var path = Routes.Fill(route.Template, values);
            TestContext.Current.TestOutputHelper?.WriteLine($"{route.Method} {route.Template} [{string.Join(",", route.Policies)}]");

            var noCookie = await anonymous.SendAsync(Request(route.Method, path), Ct);
            Assert.True(noCookie.StatusCode == HttpStatusCode.Unauthorized, $"{route.Method} {path} without a cookie: {(int)noCookie.StatusCode}");

            if (route.Policies.Contains(Policies.Tutor))
            {
                var asStudent = await student.SendAsync(Request(route.Method, path), Ct);
                Assert.True(asStudent.StatusCode == HttpStatusCode.Forbidden, $"{route.Method} {path} as a student: {(int)asStudent.StatusCode}");
                Assert.Equal("auth.forbidden", await Code(asStudent));
            }
        }

        // api.md#conventions: everything outside /api/auth and /api/me is tutor-only.
        var unguarded = routes.Where(r => !r.Anonymous && r.Template.StartsWith("/api/", StringComparison.Ordinal)
            && !r.Template.StartsWith("/api/auth/", StringComparison.Ordinal) && !r.Template.StartsWith("/api/me", StringComparison.Ordinal)
            && !r.Policies.Contains(Policies.Tutor));
        Assert.Empty(unguarded);

        Assert.Equal(HttpStatusCode.OK, (await tutor.GetAsync("/api/students", Ct)).StatusCode); // the routes do work for the tutor
    }

    private static HttpRequestMessage Request(string method, string path) => new(new HttpMethod(method), path)
    {
        Content = method is "GET" or "HEAD" ? null : new StringContent("{}", System.Text.Encoding.UTF8, "application/json"),
    };

    private static async Task<string?> Code(HttpResponseMessage response)
    {
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        return problem.RootElement.GetProperty("code").GetString();
    }
}
