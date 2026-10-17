# ADR-0016: Minimal APIs, ProblemDetails with error codes, OpenAPI → TypeScript

Status: Accepted (2026-10-17)

## Decision
- **Minimal API** endpoint groups per module (`MapGroup("/api/students").RequireAuthorization(Policies.Tutor)`), with no MVC controllers.
- Request validation uses the built-in .NET 10 minimal-API validation (`builder.Services.AddValidation()` + DataAnnotations) for the *shape* of a request. Domain rules (uniqueness, state transitions) are checked in module services and return a typed error. **FluentValidation is not added.**
- All errors are RFC 9457 `ProblemDetails` with extensions `code` (a stable string) and, for validation, `errors: { field: [code] }`. Unhandled exceptions → 500 with a correlation ID and no stack trace outside development.
- `Microsoft.AspNetCore.OpenApi` generates `/openapi/v1.json` (served in development only). The frontend generates types from it with `openapi-typescript`, and CI fails if the committed `schema.d.ts` is stale.
- JSON: camelCase, ISO-8601 UTC timestamps (`2026-10-17T12:00:00Z`), UUID v7 string IDs, enums as lowercase strings.

## Alternatives
- Controllers: more ceremony, no benefit here.
- A hand-written TypeScript client: drifts from the API. A generated client library adds weight; types plus a small `fetch` wrapper is enough.
