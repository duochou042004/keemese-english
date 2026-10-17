# Backend Conventions

Applies to `src/Keemese.Api` and `tests/*`. Architecture: ADR-0002. API rules: ADR-0016.

## Layout

```text
src/Keemese.Api/
  Program.cs                 composition root: services, middleware, MapXxxEndpoints()
  Infrastructure/
    Data/AppDbContext.cs     DbSets for all modules; ApplyConfigurationsFromAssembly
    Data/Migrations/
    Data/AuditInterceptor.cs created_at/updated_at
    Files/IFileStorage.cs, LocalFileStorage.cs, FileTypeSniffer.cs
    Security/CurrentUser.cs, Policies.cs, AntiforgeryMiddleware.cs, PasswordChangeGate.cs
  Shared/
    Errors/AppError.cs       code + status; Results helpers → ProblemDetails
    Text/SearchText.cs       normalization for search (NFC, lower, unaccent on the DB side)
  Modules/<Module>/
    <Module>Endpoints.cs     MapGroup + handlers (thin)
    <Module>Service.cs       business logic (one or a few classes per module, split when > ~400 lines)
    Domain/                  entities, enums, domain rules
    Data/                    IEntityTypeConfiguration<T> per entity
    Contracts/               public interfaces + DTOs other modules may use
    Dtos.cs                  request/response records (tutor and student DTOs are separate types)
tests/Keemese.UnitTests/         pure logic: grading, progress math, validation, architecture test
tests/Keemese.IntegrationTests/  WebApplicationFactory + Testcontainers; API, authz, isolation
```

## Rules

1. **Endpoints are thin.** Bind the request, call the service, map the result. No EF queries in endpoint lambdas.
2. **Services take `AppDbContext` directly.** No generic repository and no unit-of-work wrapper. `SaveChangesAsync` once per use case. Multi-aggregate use cases (wrap-up, assign) use one explicit transaction.
3. **Results, not exceptions, for expected failures.** Services return `Result<T>` / `AppError` (code + HTTP status). Exceptions are for bugs and infrastructure failures only.
4. **Student scoping is structural.** Every `/api/me` handler gets `currentUser.StudentId` (throws if the role isn't student) and every query starts with `.Where(x => x.StudentId == studentId)`. Tutor handlers that take `{studentId}` from the route check that the student exists.
5. **Separate DTOs per audience.** `StudentTaskDto` never reuses `TutorStudentActivityDto`. A student DTO must not have a property that could carry private data (notes, prep notes, answer keys before release).
6. **Validation layers:**
   - Shape (required, length, range, enum): DataAnnotations on request records, checked by the built-in validation → 400 `validation.failed` with field codes.
   - Domain (uniqueness, state transitions, references exist and belong to the same student): services → 400, 404 or 409 with a specific code.
   - DB constraints back up the important ones (uniqueness, FKs, check constraints). Map unique violations to the domain code, never a 500.
7. **Text limits** (defaults): titles ≤ 200, names ≤ 120, usernames 3–40 `[a-z0-9._-]` (normalized to lowercase), notes and summaries ≤ 20,000 characters, rich text JSON ≤ 1 MB, tags ≤ 20 per item × 40 characters.
8. **Rich text** is stored as editor JSON (OD-05). The server validates it against the allowed node and mark list and strips everything else. HTML rendering happens on the client from that whitelist. **No raw HTML is ever accepted.**
9. **Time:** inject `TimeProvider`. Never call `DateTime.Now`. Compare deadlines on the server only.
10. **Async all the way.** Pass `CancellationToken` from the endpoint to EF.
11. **No PII in logs.** Log IDs, not names, usernames or content. Never log request bodies.
12. **No speculative abstractions.** An interface needs a second implementation or a test seam that is actually used. `IFileStorage` qualifies (tests use a temp directory). `IStudentService` with a single implementation does not.

## Error handling

- `UseExceptionHandler` + `AddProblemDetails()`. Unhandled → 500 `common.unexpected` + `traceId`. The stack trace is logged on the server, never returned outside development.
- Db unique violation → mapped per constraint name. Concurrency (`DbUpdateConcurrencyException`) → 409 `concurrency.conflict`.
- File storage failure during upload → 503 `files.storage_unavailable`, and the DB row is not committed.

## Testing hooks

- `WebApplicationFactory<Program>` overrides: connection string → Testcontainer, `DATA_DIR` → temp directory, `TimeProvider` → `FakeTimeProvider`.
- Test helpers: `AsTutor()`, `AsStudent(name)` return authenticated `HttpClient`s with antiforgery handled.

## Commands (once scaffolded in M0)

```bash
dotnet build
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests   # needs Docker or Podman
dotnet run --project src/Keemese.Api
```
