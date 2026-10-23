using Keemese.Api.Infrastructure.Security;

namespace Keemese.Api.Modules.Identity;

public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth");

        auth.MapPost("/login", async (LoginRequest request, IdentityService service, HttpContext http, CancellationToken ct) =>
            await service.LoginAsync(request, http, ct) is { } error ? error.ToResult() : Results.NoContent())
            .AllowAnonymous();

        auth.MapPost("/logout", async (IdentityService service, HttpContext http) =>
        {
            await service.LogoutAsync(http);
            return Results.NoContent();
        }).RequireAuthorization();

        auth.MapGet("/me", async (IdentityService service, ICurrentUser currentUser, HttpContext http, CancellationToken ct) =>
            await service.GetMeAsync(currentUser.UserId, http, ct) is { } me ? Results.Ok(me) : Results.NotFound())
            .RequireAuthorization();
    }
}
