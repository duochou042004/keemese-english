using System.Security.Claims;
using Keemese.Api.Infrastructure.Security;
using Keemese.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Keemese.Api.Modules.Identity;

public sealed class AppSignInManager(
    UserManager<AppUser> userManager,
    IHttpContextAccessor contextAccessor,
    IUserClaimsPrincipalFactory<AppUser> claimsFactory,
    IOptions<IdentityOptions> optionsAccessor,
    ILogger<SignInManager<AppUser>> logger,
    IAuthenticationSchemeProvider schemes,
    IUserConfirmation<AppUser> confirmation)
    : SignInManager<AppUser>(userManager, contextAccessor, claimsFactory, optionsAccessor, logger, schemes, confirmation)
{
    // Runs on every request (ValidationInterval = 0): a deactivated user loses the session at once.
    public override async Task<AppUser?> ValidateSecurityStampAsync(ClaimsPrincipal? principal) =>
        await base.ValidateSecurityStampAsync(principal) is { IsActive: true } user ? user : null;
}

/// <summary>Adds the role claim the Tutor/Student policies check, and the must-change-password flag for the gate.</summary>
public sealed class AppClaimsPrincipalFactory(UserManager<AppUser> userManager, IOptions<IdentityOptions> optionsAccessor)
    : UserClaimsPrincipalFactory<AppUser>(userManager, optionsAccessor)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(AppUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(Options.ClaimsIdentity.RoleClaimType, user.Role));
        if (user.MustChangePassword) identity.AddClaim(new Claim(PasswordChangeGate.ClaimType, "true"));
        return identity;
    }
}
