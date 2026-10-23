using System.Security.Claims;
using Keemese.Api.Modules.Identity.Domain;

namespace Keemese.Api.Infrastructure.Security;

public interface ICurrentUser
{
    Guid UserId { get; }
    string Role { get; }

    /// <summary>The signed-in student's ID. Throws for anyone else, so a tutor can never reach /api/me data by accident.</summary>
    Guid StudentId { get; }
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal Principal => accessor.HttpContext?.User ?? throw new InvalidOperationException("No HTTP context.");

    public Guid UserId => Guid.Parse(Principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Not signed in."));

    public string Role => Principal.FindFirstValue(ClaimTypes.Role) ?? throw new InvalidOperationException("Not signed in.");

    public Guid StudentId => Role == Roles.Student ? UserId : throw new InvalidOperationException("The current user is not a student.");
}
