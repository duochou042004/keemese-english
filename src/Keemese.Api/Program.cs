using Keemese.Api.Infrastructure.Data;
using Keemese.Api.Infrastructure.Health;
using Keemese.Api.Infrastructure.Security;
using Keemese.Api.Modules.Identity;
using Keemese.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Net;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<AuditInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) => options
    .UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Db")
        ?? throw new InvalidOperationException("ConnectionStrings:Db is not configured."))
    .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = ctx =>
{
    if (ctx.ProblemDetails.Extensions.ContainsKey("code")) return;
    var code = ctx.ProblemDetails.Status switch
    {
        StatusCodes.Status401Unauthorized => "auth.unauthenticated",
        StatusCodes.Status403Forbidden => "auth.forbidden",
        StatusCodes.Status404NotFound => "common.not_found",
        StatusCodes.Status500InternalServerError => "common.unexpected",
        _ => null,
    };
    if (code is not null) ctx.ProblemDetails.Extensions["code"] = code;
});
builder.Services.AddOpenApi();

// Data Protection keys on the data volume, so a restart doesn't log everyone out (ADR-0004).
builder.Services.AddDataProtection().SetApplicationName("keemese");
builder.Services.AddOptions<KeyManagementOptions>().Configure<IConfiguration, ILoggerFactory>((options, config, loggers) =>
    options.XmlRepository = new FileSystemXmlRepository(new DirectoryInfo(Path.Combine(config["DATA_DIR"]!, "keys")), loggers));

// ADR-0004: Identity's cookie, same origin. Plain-HTTP cookies only in Development.
var cookieSecurity = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
var cookiePrefix = builder.Environment.IsDevelopment() ? "" : "__Host-";
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
builder.Services.AddIdentityCore<AppUser>(options =>
    {
        // FR-AUTH-AC2 / T1: 5 failures → 15 minutes.
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager<AppSignInManager>()
    .AddClaimsPrincipalFactory<AppClaimsPrincipalFactory>();
// PasswordPolicy replaces Identity's composition-rule validator (security-model.md#authentication).
builder.Services.Replace(ServiceDescriptor.Scoped<IPasswordValidator<AppUser>, PasswordPolicy>());
builder.Services.AddSingleton<LoginRateLimiter>();
builder.Services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = cookiePrefix + "keemese";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = cookieSecurity;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
    // ProblemDetails (auth.unauthenticated / auth.forbidden) come from the status code pages, never a redirect.
    options.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    options.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = AntiforgeryMiddleware.HeaderName;
    options.Cookie.Name = cookiePrefix + "keemese-af";
    options.Cookie.SecurePolicy = cookieSecurity;
    options.Cookie.SameSite = SameSiteMode.Strict;
});
builder.Services.AddAuthorizationBuilder().AddKeemesePolicies();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IdentityService>();

// Trust X-Forwarded-* only from the configured proxies (comma-separated); none configured = trust nobody.
builder.Services.AddOptions<ForwardedHeadersOptions>().Configure<IConfiguration>((options, config) =>
{
    options.KnownProxies.Clear(); // drops the loopback default
    options.KnownIPNetworks.Clear();
    foreach (var proxy in List(config["ForwardedHeaders:KnownProxies"])) options.KnownProxies.Add(IPAddress.Parse(proxy));
    foreach (var network in List(config["ForwardedHeaders:KnownNetworks"])) options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
    // Two empty lists make the middleware skip the address check and trust everyone, so forward nothing then.
    options.ForwardedHeaders = options.KnownProxies.Count + options.KnownIPNetworks.Count == 0
        ? ForwardedHeaders.None
        : ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    static string[] List(string? value) => value?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];
});
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(180)); // no preload, no subdomains

builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"])
    .AddCheck<DataDirHealthCheck>("data_dir", tags: ["ready"]);

var app = builder.Build();

if (string.IsNullOrEmpty(app.Configuration["Security:IpHashSalt"]))
{
    throw new InvalidOperationException("Security:IpHashSalt is not configured (Security__IpHashSalt).");
}

// Operator CLI (FR-AUTH-AC9): reset the tutor's password and exit without starting the web host.
if (args.Contains("--reset-tutor-password"))
{
    await using var cliScope = app.Services.CreateAsyncScope();
    var password = await cliScope.ServiceProvider.GetRequiredService<IdentityService>().ResetTutorPasswordAsync(CancellationToken.None);
    if (password is null)
    {
        Console.Error.WriteLine("No tutor exists yet; set BOOTSTRAP_TUTOR_USERNAME and BOOTSTRAP_TUTOR_PASSWORD and start the app.");
        Environment.ExitCode = 1;
        return;
    }
    Console.WriteLine($"New temporary tutor password (shown once; change it at the next login): {password}");
    return;
}

await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<IdentityService>().BootstrapTutorAsync(CancellationToken.None);
}

app.UseForwardedHeaders();
app.UseSecurityHeaders(); // OnStarting-based, so placing it first also covers the HTTPS redirect
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    app.UseHsts();
    app.UseHttpsRedirection(); // behind the TLS proxy the forwarded proto is already https, so no redirect
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
app.UsePasswordChangeGate(); // FR-AUTH-AC5
app.UseKeemeseAntiforgery();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

app.MapIdentityEndpoints();

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") }).AllowAnonymous();

// Unknown API and health paths are a 404, never the SPA; every other path gets index.html for client routing.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallback("/health/{**path}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallback("{**path:file}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous(); // missing favicon, stale asset
app.MapFallbackToFile("index.html", spaFiles).AllowAnonymous();

app.Run();
