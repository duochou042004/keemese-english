using Keemese.Api.Infrastructure.Security;

namespace Keemese.Api.Modules.Identity;

public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth");

        auth.MapPost("/login", async (LoginRequest request, IdentityService service, HttpContext http, CancellationToken ct) =>
            await service.LoginAsync(request, http, ct) is { } error ? error.ToResult() : Results.NoContent())
            .Produces(StatusCodes.Status204NoContent).AllowAnonymous();

        auth.MapPost("/logout", async (IdentityService service, HttpContext http) =>
        {
            await service.LogoutAsync(http);
            return Results.NoContent();
        }).Produces(StatusCodes.Status204NoContent).RequireAuthorization().AllowDuringPasswordChange();

        auth.MapGet("/me", async (IdentityService service, ICurrentUser currentUser, HttpContext http, CancellationToken ct) =>
            await service.GetMeAsync(currentUser.UserId, http, ct) is { } me ? Results.Ok(me) : Results.NotFound())
            .Produces<MeDto>().RequireAuthorization().AllowDuringPasswordChange();

        auth.MapPost("/change-password", async (ChangePasswordRequest request, IdentityService service, ICurrentUser currentUser, HttpContext http, CancellationToken ct) =>
            await service.ChangePasswordAsync(currentUser.UserId, request, http, ct) is { } error ? error.ToResult() : Results.NoContent())
            .Produces(StatusCodes.Status204NoContent).RequireAuthorization().AllowDuringPasswordChange();

        auth.MapPut("/preferences", async (PreferencesRequest request, IdentityService service, ICurrentUser currentUser, CancellationToken ct) =>
            await service.SetPreferencesAsync(currentUser.UserId, request, ct) is { } error ? error.ToResult() : Results.NoContent())
            .Produces(StatusCodes.Status204NoContent).RequireAuthorization();
    }
}
