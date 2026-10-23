namespace Keemese.Api.Shared.Errors;

/// <summary>An expected failure: a stable code for the client plus the HTTP status (backend conventions rule 3).</summary>
public sealed record AppError(string Code, int Status, IReadOnlyDictionary<string, string[]>? Errors = null)
{
    /// <summary>400 <c>validation.failed</c> with one field code, e.g. <c>newPassword: password.too_short</c>.</summary>
    public static AppError Validation(string field, string code) =>
        new("validation.failed", StatusCodes.Status400BadRequest, new Dictionary<string, string[]> { [field] = [code] });

    public IResult ToResult()
    {
        var extensions = new Dictionary<string, object?> { ["code"] = Code };
        if (Errors is not null) extensions["errors"] = Errors;
        return Results.Problem(statusCode: Status, extensions: extensions);
    }
}
