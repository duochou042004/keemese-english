namespace Keemese.Api.Infrastructure.Security;

/// <summary>The app's web security headers (docs/security/security-model.md#web-security-headers-app).</summary>
public static class SecurityHeaders
{
    // Verbatim from the security model; changing it requires a security review.
    public const string ContentSecurityPolicy =
        "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) => app.Use((context, next) =>
    {
        // OnStarting, so the headers survive the exception handler clearing the response.
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.TryAdd("Content-Security-Policy", ContentSecurityPolicy); // an endpoint may set a stricter one (file responses)
            headers.XContentTypeOptions = "nosniff";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()";
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                headers.CacheControl = "private, no-store"; // T18: a shared device keeps no API data
            }
            return Task.CompletedTask;
        });
        return next(context);
    });
}
