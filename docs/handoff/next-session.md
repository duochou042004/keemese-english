# Next session: T-105, generated API types, CI freshness check, auth-aware fetch wrapper

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-105-api-types-and-fetch-wrapper.md. Do not rely on chat history.

## State (verified 2026-10-24)
- M0 closed. T-101 (PR #8), T-102 (PR #10), T-103 (PR #12) and T-104 (PR #14, 4f549e9) are merged into `develop`; push CI on develop green (all 5 jobs). Evidence is in progress.json.
- T-104 left: `/api/students/**` (Tutor policy: list/search, create, get, patch with `version`, archive/restore, reset-password, unlock, delete with `confirmName`), Identity's `IAccountService` contract, `AuthorizationSuiteTests` + `IsolationSuiteTests` (both discover endpoints; 0 `/api/me` routes in M1), test builders in `tests/Keemese.IntegrationTests/Given.cs` (`Given.Student(...)`, `AsReadyTutor()` once per app, `AsStudent(...)`, `FromNewIp()`). Tutor DTOs are `TutorStudentDto` / `TutorStudentListItemDto`. Contract details are in docs/architecture/api.md#students-students--identity.
- T-104 follow-ups (not in T-105): a T6 reflection test over student DTOs and an isolation-suite "count > 0" assertion with the first `/api/me` route (M2); a concurrent-create test for the username race.
- gitleaks flags invented password literals assigned to `*Password` names (generic-api-key). Avoid such literals or add the reviewed fingerprint to `.gitleaksignore` (precedent T-102, T-104).
- Windows: a local Application Control policy randomly blocks the Debug `Keemese.Api.dll`; run .NET tests with `-c Release`.

## Before starting
1. Check `pending_owner_actions` in progress.json (threat-model T19 follow-up, branch protection, Dependabot security updates, OD-01/02/04/07/08).
2. Merges: docs/agents/operating-model.md#merge-delegation only. T-105 changes CI and `web/src/api/**` (L4, antiforgery handling): ask before merging.

## The one next task
T-105 on `feature/m1-api-types` from `develop`. Follow the packet exactly: option 1 (`Microsoft.Extensions.ApiDescription.Server`, build-time only, approved 2026-10-23) and `openapi-typescript` (ADR-0016); skip startup migration/bootstrap when the document generator runs; the CI step "API types are up to date"; `apiFetch` XSRF header, JSON bodies, 401 handler; `safeRedirect`. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, `dotnet test tests/Keemese.UnitTests -c Release` → 27 pass, `dotnet test tests/Keemese.IntegrationTests -c Release` → 37 pass (Docker; background), `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web` → 13 pass (last run 2026-10-23), `node --test ".claude/hooks/*.test.mjs"` → 13, `node --test "scripts/*.test.mjs"` → 4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-105 in review with evidence recorded → ask for merge approval. Stop.
