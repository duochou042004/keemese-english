# T-105: Generated API types, the CI freshness check, and the auth-aware fetch wrapper

- Milestone: M1 · Ladder level: L4 (`web/src/api/**`, CI) · Depends on: T-102 merged (can run in parallel with T-103 in its own worktree; disjoint files) · Branch: `feature/m1-api-types` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: done (merged via PR #16, 23cc0cc)

## Objective
The SPA's API types are generated from the API's OpenAPI document, CI fails when they are stale, and `apiFetch` sends the antiforgery header and handles 401 the way ADR-0004 and the IA describe.

## Requirements / acceptance criteria
- **ADR-0016:** `openapi-typescript` (exact version, devDependency, already decided by ADR-0016) generates `web/src/api/schema.d.ts` from a committed `web/src/api/openapi.json`. Script `npm run api:types`.
- **Producing `openapi.json` without a database** (option 1, **approved by the Lead Coordinator 2026-10-23**; record it in docs/testing/ci.md): `Microsoft.Extensions.ApiDescription.Server` (build-time only, `PrivateAssets=all`, Microsoft-maintained) writes the document on `dotnet build` of the API. The startup migration and bootstrap must be skipped when the document generator runs. *(Rejected alternative: an integration test comparing `/openapi/v1.json` with the committed file.)*
- **CI step "API types are up to date"** (docs/testing/ci.md#ciyml--every-pr-to-develop-or-master-and-pushes-to-develop-and-master): regenerate the document and `schema.d.ts`, then `git diff --exit-code web/src/api`. It runs in the job that has what it needs (`backend` for option 1, plus node; or `web` with the document committed). Update ci.md to match.
- **`apiFetch` (L4):** reads the `XSRF-TOKEN` cookie and sends `X-XSRF-TOKEN` on POST/PUT/PATCH/DELETE; sends JSON bodies with `Content-Type: application/json`; on **401** from anything except `/api/auth/login` and `/api/auth/me`, clears the TanStack Query cache and navigates to `/login?redirect=<current path>` (through a small registered handler so `apiFetch` stays framework-free); keeps the existing ProblemDetails → code mapping. Typed helpers use `paths` from `schema.d.ts` (no hand-written response types for generated endpoints). Remove the `shortcut:` comment it resolves.
- **Redirect validation** (IA "Deep links"): a `safeRedirect(target, role)` helper accepts only same-origin relative paths inside the role's area (`/t/*` tutor, `/s/*` student, plus `/change-password`); anything else → the role home. Unit-tested with hostile inputs (`//evil`, `/\evil`, `https://…`, `/s/x` for a tutor).
- Vitest: XSRF header on unsafe methods only, 401 handler fires (not for login/me), JSON body header, `safeRedirect` table.

## Inputs (read these, nothing more)
- docs/decisions/0016-minimal-apis-and-contracts.md · docs/decisions/0004-cookie-auth-same-origin.md
- docs/frontend/information-architecture.md#data-fetching, #routes (Deep links)
- docs/testing/ci.md · `web/src/api/client.ts` · `.github/workflows/ci.yml`

## File ownership
- create/modify: `web/src/api/**`, `web/src/lib/**` (redirect helper), `web/package.json` + lock (openapi-typescript only), `.github/workflows/ci.yml` (the one step), `docs/testing/ci.md`, `progress.json`; for option 1 also `src/Keemese.Api/Keemese.Api.csproj`, `Directory.Packages.props`, `src/Keemese.Api/Program.cs` (skip startup work under the generator)
- must not touch: `web/src/routes/**` (T-106), `Modules/**`

## Out of scope
Login and change-password pages, guards (T-106). MSW and Testing Library (T-106 adds them with the first component test).

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
npm run api:types --prefix web && git diff --exit-code web/src/api     # after regenerating the document
dotnet build -warnaserror
```
Plus one CI run on the PR showing the new step green, and one deliberate stale-types commit (then reverted) showing it red. Record both run URLs.
Review: `reviewer` (L4) + `security-reviewer` (fetch wrapper, redirects, CI).

## Status / notes
—
