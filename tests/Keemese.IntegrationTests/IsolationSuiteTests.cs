using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Keemese.IntegrationTests;

/// <summary>
/// NFR-SEC-01 / T4–T6, testing strategy#isolation-suite steps 1–3. Discovers every <c>/api/me/**</c> and
/// <c>/api/files/{id}</c> route, so endpoints added in M2+ are checked without editing this class (a new route
/// parameter fails until it gets a fixture value). M1 has no such routes, so only the discovery and
/// <c>/api/auth/me</c> are exercised.
/// </summary>
public sealed class IsolationSuiteTests(PostgresFixture postgres) : IDisposable
{
    private readonly string _dataDir = Directory.CreateTempSubdirectory("keemese-test-").FullName;

    public void Dispose() => Directory.Delete(_dataDir, recursive: true);

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Student_B_cannot_reach_student_A_data_and_A_sees_no_tutor_only_fields()
    {
        await using var app = new KeemeseFactory(postgres.NewDatabase(), _dataDir).WithTutor().WithClientIps();
        var tutor = await app.AsReadyTutor();
        var a = await Given.Student("Nguyễn Minh Anh").CreateAsync(tutor);
        var b = await Given.Student("Trần Thị Bình").CreateAsync(tutor);
        var asA = await app.AsStudent(a);
        var asB = await app.AsStudent(b);

        var routes = Routes.Discover(app);
        Assert.Contains(routes, r => r.Template == "/api/auth/me"); // discovery sees the real endpoint table
        var studentRoutes = routes.Where(r => r.Template.StartsWith("/api/me", StringComparison.Ordinal)
            || r.Template.StartsWith("/api/files/{", StringComparison.Ordinal)).ToList();
        TestContext.Current.TestOutputHelper?.WriteLine($"isolation suite: {studentRoutes.Count} student routes discovered");

        // A's resource IDs per route parameter. Empty in M1; M2+ seeds A's goals, sessions, tasks, attempts and files here.
        var aOwned = new Dictionary<string, string>();

        foreach (var route in studentRoutes.Where(r => r.Template.Contains('{')))
        {
            var response = await asB.SendAsync(new HttpRequestMessage(new HttpMethod(route.Method), Routes.Fill(route.Template, aOwned)), Ct);
            Assert.True(response.StatusCode == HttpStatusCode.NotFound, $"B on A's {route.Method} {route.Template}: {(int)response.StatusCode}");
        }

        foreach (var route in studentRoutes.Where(r => r.Method == "GET"))
        {
            var response = await asA.GetAsync(Routes.Fill(route.Template, aOwned), Ct);
            AssertNoPrivateData(await response.Content.ReadAsStringAsync(Ct), a, b, route.Template);
        }

        var me = await asA.GetAsync("/api/auth/me", Ct);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var body = await me.Content.ReadAsStringAsync(Ct);
        AssertNoPrivateData(body, a, b, "/api/auth/me");
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Equal(["displayName", "id", "language", "mustChangePassword", "role"], json.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(a.Id, json.GetProperty("id").GetGuid());
        Assert.Equal("Nguyễn Minh Anh", json.GetProperty("displayName").GetString());
        Assert.Equal("student", (await asB.GetFromJsonAsync<JsonElement>("/api/auth/me", Ct)).GetProperty("role").GetString());
    }

    private static void AssertNoPrivateData(string body, CreatedStudent own, CreatedStudent other, string route)
    {
        foreach (var value in own.Seed.PrivateValues.Concat(other.Seed.PrivateValues))
        {
            Assert.False(body.Contains(value, StringComparison.OrdinalIgnoreCase), $"{route} leaks a tutor-only value");
        }
        Assert.False(body.Contains(other.Id.ToString(), StringComparison.OrdinalIgnoreCase), $"{route} leaks the other student's ID");
    }
}
