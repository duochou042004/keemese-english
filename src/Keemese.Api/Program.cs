using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Infrastructure.Health;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>((sp, options) => options.UseNpgsql(
    sp.GetRequiredService<IConfiguration>().GetConnectionString("Db")
    ?? throw new InvalidOperationException("ConnectionStrings:Db is not configured.")));

builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = ctx =>
{
    if (ctx.ProblemDetails.Extensions.ContainsKey("code")) return;
    var code = ctx.ProblemDetails.Status switch
    {
        StatusCodes.Status404NotFound => "common.not_found",
        StatusCodes.Status500InternalServerError => "common.unexpected",
        _ => null,
    };
    if (code is not null) ctx.ProblemDetails.Extensions["code"] = code;
});
builder.Services.AddOpenApi();

// Placeholder scheme so the fallback policy can challenge with 401; Identity's cookie replaces it in M1.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    });
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"])
    .AddCheck<DataDirHealthCheck>("data_dir", tags: ["ready"]);

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

// The SPA build in wwwroot (ADR-0005): Vite-hashed /assets/* are immutable, everything else revalidates.
var spaFiles = new StaticFileOptions
{
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl =
        ctx.Context.Request.Path.StartsWithSegments("/assets") ? "public, max-age=31536000, immutable" : "no-cache",
};
app.UseStaticFiles(spaFiles);
app.UseRouting(); // after static files, so the file fallback below only sees files that don't exist
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") }).AllowAnonymous();

// Unknown API and health paths are a 404, never the SPA; every other path gets index.html for client routing.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallback("/health/{**path}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallback("{**path:file}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous(); // missing favicon, stale asset
app.MapFallbackToFile("index.html", spaFiles).AllowAnonymous();

app.Run();
