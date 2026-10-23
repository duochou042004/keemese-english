using Keemese.Api.Shared.Errors;

namespace Keemese.Api.Infrastructure.Security;

/// <summary>
/// FR-AUTH-AC5: a user who must change their password gets 403 on every API endpoint except the ones marked
/// <c>AllowDuringPasswordChange()</c> (me, change-password, logout). The claim is rebuilt from the database on
/// every request by the security stamp validator, so it is never stale.
/// </summary>
public static class PasswordChangeGate
{
    public const string ClaimType = "keemese:must_change_password";

    private static readonly AppError Required = new("auth.password_change_required", StatusCodes.Status403Forbidden);

    public static TBuilder AllowDuringPasswordChange<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder =>
        builder.WithMetadata(new AllowDuringPasswordChangeMetadata());

    public static IApplicationBuilder UsePasswordChangeGate(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        if (context.User.HasClaim(ClaimType, "true")
            && context.Request.Path.StartsWithSegments("/api") // the SPA itself must still load
            && context.GetEndpoint()?.Metadata.GetMetadata<AllowDuringPasswordChangeMetadata>() is null)
        {
            await Required.ToResult().ExecuteAsync(context);
            return;
        }
        await next(context);
    });

    private sealed class AllowDuringPasswordChangeMetadata;
}
