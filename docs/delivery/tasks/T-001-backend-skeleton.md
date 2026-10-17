# T-001: Backend skeleton, Compose PostgreSQL, test projects

- Milestone: M0 · Ladder level: L4 (new solution, CI-relevant pins) · Depends on: Phase 1 approval · Branch: `feature/m0-backend-skeleton` (from `develop`)
- Status: not_started

## Objective
A buildable, testable .NET 10 backend that starts against PostgreSQL in Compose, applies an initial migration, and reports health. There is **no** product feature yet.

## Requirements / acceptance criteria
- ADR-0012: `global.json` pins SDK `10.0.400` with `rollForward: latestPatch`. `Directory.Packages.props` (Central Package Management) and `Directory.Build.props` (`Nullable` enable, `TreatWarningsAsErrors` true, `LangVersion` default for .NET 10 = C# 14). NuGet lock files enabled.
- ADR-0002: `src/Keemese.Api` (minimal API host) with the folders `Infrastructure/`, `Shared/` and `Modules/` (empty module folders get no placeholder classes).
- `AppDbContext` (Npgsql, snake_case naming) + an initial migration that only creates the `unaccent` extension and the `f_unaccent` immutable wrapper (database.md conventions).
- `GET /health/live` → 200. `GET /health/ready` → 200 when the DB is reachable and `DATA_DIR` is writable, else 503. Both anonymous.
- ProblemDetails + the exception handler wired (ADR-0016). An unknown `/api/*` path → 404 ProblemDetails.
- Fallback authorization policy = authenticated (no auth scheme yet beyond what this needs; Identity arrives in M1). The health endpoints are explicitly anonymous.
- `deploy/compose.yaml`: service `db` (`docker.io/library/postgres:18.6-alpine`, named volume, `127.0.0.1` port binding, `pg_isready` health check) following the [portability rules](../../operations/local-setup.md#compose-portability-rules-docker-and-podman). The `app` profile is added in T-002.
- `.env.example` with placeholders exactly as in local-setup.md.
- `tests/Keemese.UnitTests`: one real test (e.g. the architecture test skeleton: types in `Modules.X` don't reference `Modules.Y` except `.Contracts`; passes trivially now but is wired).
- `tests/Keemese.IntegrationTests`: `WebApplicationFactory` + `Testcontainers.PostgreSql`. A test that boots the app, applies migrations to an empty PostgreSQL 18 container, and gets 200 from `/health/ready`.
- Package versions current on 2026-10-17 (verify again at install): EF Core/ASP.NET 10.0.13, Npgsql EF 10.0.3, xunit.v3 4.0.x, Testcontainers.PostgreSql 4.16.x, Mvc.Testing 10.0.13, Microsoft.AspNetCore.OpenApi 10.0.13.

## Inputs
- docs/backend/conventions.md · docs/architecture/overview.md#request-pipeline-order-matters · docs/architecture/database.md#conventions · docs/operations/local-setup.md · docs/decisions/0002, 0003, 0012, 0013, 0016

## File ownership
- create/modify: `global.json`, `Directory.*.props`, `Keemese.slnx`, `src/**`, `tests/**`, `deploy/compose.yaml`, `.env.example`, `docs/operations/local-setup.md` (corrections only), `progress.json`
- must not touch: `web/**`, `.github/**`, product docs other than corrections

## Out of scope
Identity/auth, any module feature, Dockerfile (T-002), CI (T-003), Scalar/Swagger UI.

## Verification
```bash
dotnet build -warnaserror
dotnet test tests/Keemese.UnitTests
docker compose -f deploy/compose.yaml up -d db
dotnet test tests/Keemese.IntegrationTests      # background; needs Docker
dotnet run --project src/Keemese.Api            # then GET http://localhost:5080/health/ready → 200
```
Evidence: command + summary lines in `progress.json`. Note explicitly that Podman was not tested (R-08).
Review: `reviewer` subagent (L4).

## Status / notes
—
