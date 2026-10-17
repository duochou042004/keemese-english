# ADR-0002: Modular monolith in one ASP.NET Core project

Status: Accepted (2026-10-17)

## Context
The spec asks for a modular monolith and rules out microservices (§35). One tutor, about 100 students, a small team (one human plus agents). The tech baseline is .NET 10 LTS, C# 14, ASP.NET Core and EF Core.

## Decision
- **One deployable**, `src/Keemese.Api`. Modules are top-level folders and namespaces: `Modules/Identity`, `Students`, `Content`, `QuestionBank`, `Activities`, `Lessons`, `LearningPlans`, `Progress`. Plus `Infrastructure/` (database, files, clock) and `Shared/` (results, errors, current user).
- Each module owns its entities, EF configurations, endpoints and services. Other modules may use only its `Contracts` namespace (interfaces and DTOs), or its IDs as foreign keys.
- **One `AppDbContext`** in the `public` schema, built from each module's entity configurations. Cross-module foreign keys are allowed; cross-module navigation properties are not.
- Boundaries are enforced by a reflection-based architecture unit test (no extra package). A type in `Modules.X` may reference `Modules.Y` only through `Modules.Y.Contracts`.
- No mediator library, no repository-over-EF layer, no CQRS framework. Endpoints call module services, and services use `AppDbContext` directly.

## Alternatives
- One project per module (`*.csproj` ×8): the compiler enforces boundaries, but it adds solution sprawl and slower builds for no present benefit. **Revisit** if the architecture test proves leaky.
- Clean Architecture with 4 layers: too much ceremony for this domain size (§54 puts simplicity first).
- Microservices: excluded by §35.

## Consequences
- Fast build and debug. A module can be extracted into its own project later because its boundaries are already explicit.
- Discipline is enforced by a test, not the compiler, so the reviewer checklist includes "module boundaries".

## Revisit when
The architecture test needs more than 3 documented exceptions, or a module needs an independent deployment cadence.
