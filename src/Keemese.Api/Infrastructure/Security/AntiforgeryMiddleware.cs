using Keemese.Api.Shared.Errors;
using Microsoft.AspNetCore.Antiforgery;

namespace Keemese.Api.Infrastructure.Security;

/// <summary>ADR-0004 / T3: unsafe methods from a cookie-authenticated caller need the X-XSRF-TOKEN header.</summary>
public static class AntiforgeryMiddleware
{
    public const string RequestTokenCookie = "XSRF-TOKEN";
    public const string HeaderName = "X-XSRF-TOKEN";

    private static readonly AppError Failed = new("auth.antiforgery_failed", StatusCodes.Status400BadRequest);

    public static IApplicationBuilder UseKeemeseAntiforgery(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        if (context.User.Identity?.IsAuthenticated == true
            && !(HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)
                || HttpMethods.IsOptions(context.Request.Method) || HttpMethods.IsTrace(context.Request.Method)))
        {
            var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
            if (!await antiforgery.IsRequestValidAsync(context))
            {
                await Failed.ToResult().ExecuteAsync(context);
                return;
            }
        }
        await next(context);
    });

    /// <summary>Issues a request token for <c>context.User</c> in the readable cookie the SPA echoes back.</summary>
    public static void IssueToken(HttpContext context)
    {
        var tokens = context.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(context);
        context.Response.Cookies.Append(RequestTokenCookie, tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false, // the SPA reads it
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/",
        });
    }
}
