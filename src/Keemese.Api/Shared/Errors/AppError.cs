namespace Keemese.Api.Shared.Errors;

/// <summary>An expected failure: a stable code for the client plus the HTTP status (backend conventions rule 3).</summary>
public sealed record AppError(string Code, int Status)
{
    public IResult ToResult() => Results.Problem(statusCode: Status, extensions: new Dictionary<string, object?> { ["code"] = Code });
}
