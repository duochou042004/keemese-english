using Keemese.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Authorization;

namespace Keemese.Api.Infrastructure.Security;

public static class Policies
{
    public const string Tutor = "tutor";
    public const string Student = "student";

    public static AuthorizationBuilder AddKeemesePolicies(this AuthorizationBuilder builder) => builder
        .AddPolicy(Tutor, p => p.RequireAuthenticatedUser().RequireRole(Roles.Tutor))
        .AddPolicy(Student, p => p.RequireAuthenticatedUser().RequireRole(Roles.Student))
        // "Active" is enforced per request by AppSignInManager.ValidateSecurityStampAsync: an inactive user has no principal.
        .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
}
