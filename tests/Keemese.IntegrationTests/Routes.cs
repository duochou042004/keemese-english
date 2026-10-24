using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Keemese.IntegrationTests;

/// <summary>Endpoint discovery for the authorization and isolation suites (testing strategy#isolation-suite).</summary>
public static partial class Routes
{
    public sealed record Route(string Template, string Method, bool Anonymous, IReadOnlyList<string> Policies);

    /// <summary>Every mapped (route, method) pair of the real app. Fallbacks match every method, so they get "*".</summary>
    public static List<Route> Discover(WebApplicationFactory<Program> factory) =>
        factory.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .SelectMany(e => (e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["*"]).Select(method => new Route(
                e.RoutePattern.RawText!,
                method,
                e.Metadata.GetMetadata<IAllowAnonymous>() is not null,
                e.Metadata.GetOrderedMetadata<IAuthorizeData>().Select(a => a.Policy ?? "").ToList())))
            .ToList();

    /// <summary>Fills each <c>{name}</c> from <paramref name="values"/>. A parameter with no mapping fails the test, so a new route can't skip the suite.</summary>
    public static string Fill(string template, IReadOnlyDictionary<string, string> values) =>
        Parameter().Replace(template, m => values.TryGetValue(m.Groups["name"].Value, out var value)
            ? value
            : throw new Xunit.Sdk.XunitException($"No fixture value for '{{{m.Groups["name"].Value}}}' in {template}: add a mapping to the suite."));

    [GeneratedRegex(@"\{\**(?<name>[A-Za-z]+)(:[^}]*)?\}")]
    private static partial Regex Parameter();
}
