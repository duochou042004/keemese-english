using Keemese.Api.Infrastructure.Security;
using Keemese.Api.Modules.Identity.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Keemese.Api.Modules.Students;

public static class StudentsEndpoints
{
    public static void MapStudentsEndpoints(this IEndpointRouteBuilder app)
    {
        var students = app.MapGroup("/api/students").RequireAuthorization(Policies.Tutor);

        students.MapGet("", async (string? q, string? status, int? page, int? pageSize, StudentsService service, CancellationToken ct) =>
            await service.ListAsync(q, status, page, pageSize, ct) is var (list, error) && error is null ? Results.Ok(list) : error!.ToResult());

        students.MapPost("", async (CreateStudentRequest request, StudentsService service, CancellationToken ct) =>
            await service.CreateAsync(request, ct) is var (created, error) && error is null
                ? Results.Created($"/api/students/{created!.Id}", created)
                : error!.ToResult());

        students.MapGet("/{id:guid}", async (Guid id, StudentsService service, CancellationToken ct) =>
            await service.GetAsync(id, ct) is { } student ? Results.Ok(student) : Results.NotFound());

        students.MapPatch("/{id:guid}", async (Guid id, UpdateStudentRequest request, StudentsService service, CancellationToken ct) =>
            await service.UpdateAsync(id, request, ct) is var (student, error) && error is null ? Results.Ok(student) : error!.ToResult());

        students.MapPost("/{id:guid}/archive", async (Guid id, IAccountService accounts, CancellationToken ct) =>
            await accounts.SetActiveAsync(id, false, ct) ? Results.NoContent() : Results.NotFound());

        students.MapPost("/{id:guid}/restore", async (Guid id, IAccountService accounts, CancellationToken ct) =>
            await accounts.SetActiveAsync(id, true, ct) ? Results.NoContent() : Results.NotFound());

        students.MapPost("/{id:guid}/reset-password", async (Guid id, IAccountService accounts, CancellationToken ct) =>
            await accounts.ResetPasswordAsync(id, ct) is { } password ? Results.Ok(new TemporaryPasswordDto(password)) : Results.NotFound());

        students.MapPost("/{id:guid}/unlock", async (Guid id, IAccountService accounts, CancellationToken ct) =>
            await accounts.UnlockAsync(id, ct) ? Results.NoContent() : Results.NotFound());

        // DELETE doesn't infer a body, hence [FromBody].
        students.MapDelete("/{id:guid}", async (Guid id, [FromBody] DeleteStudentRequest request, StudentsService service, CancellationToken ct) =>
            await service.DeleteAsync(id, request, ct) is { } error ? error.ToResult() : Results.NoContent());
    }
}
