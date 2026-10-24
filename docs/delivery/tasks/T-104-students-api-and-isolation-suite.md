# T-104: Students API, account actions, isolation and authorization suites

- Milestone: M1 · Ladder level: L4 (authz, student data) · Depends on: T-103 merged · Branch: `feature/m1-students-api` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: in_review

## Objective
The tutor can create, find, edit, archive, restore, reset, unlock and permanently delete students through the API, and two discovering test suites prove that students can't reach tutor routes or each other's data.

## Requirements / acceptance criteria
- **Module `Modules/Students`**: `student_profiles` (PK `user_id` → users cascade; `full_name`, `phone`, `contact_channels jsonb`, `parents jsonb`, plus the M2 learning-profile columns **not** added yet) with `xmin` concurrency. One migration `Students`. Identity exposes `IAccountService` in `Modules/Identity/Contracts` (create student login, reset, deactivate/reactivate, unlock, delete); Students calls only that contract (the module-boundary test stays green).
- **Endpoints** (docs/architecture/api.md#students-students--identity), group `/api/students` with `Policies.Tutor`:
  - `GET ?q&status=active|archived&page&pageSize` → `{items, total}`; `q` is diacritics-insensitive via `f_unaccent(lower(...))` (FR-STU-03, **AC3**: "nguyen" matches "Nguyễn").
  - `POST` create with `{fullName, userName, temporaryPassword?, email?, phone?, contactChannels?, parents?}` (FR-STU-01, FR-STU-05). Missing password → generated; returns `{id, temporaryPassword}` **once** (never stored or logged, AUTH-AC7). Username 3–40 `[a-z0-9._-]`, case-insensitive unique → `students.username_taken` (**STU-AC2**). New students have `must_change_password = true` (FR-AUTH-04).
  - `GET /{id}`, `PATCH /{id}` with `version` → `409 concurrency.conflict` on a stale edit (**STU-AC6**).
  - `POST /{id}/archive` · `/restore` (FR-AUTH-07): archive sets `is_active = false` and rotates the stamp, so the student's live session gets 401 on its next request (**AUTH-AC8**, T17); restore keeps `must_change_password`.
  - `POST /{id}/reset-password` → `{temporaryPassword}` once, sets `must_change_password`, rotates the stamp (FR-AUTH-06, AC6, AC7). `POST /{id}/unlock` (AUTH-AC9).
  - `DELETE /{id}` with `{confirmName}` matching `full_name` (FR-STU-06) → rows removed via cascade. Files don't exist until M3: leave a `// shortcut:` note pointing to FR-STU-AC5's file part in M3.
  - Audit events: `student.created`, `student.password_reset`, `student.archived`, `student.restored`, `student.unlocked`, `student.deleted` (IDs only).
  - Unknown or non-student `{id}` → 404.
- **DTOs:** tutor DTOs only; nothing in M1 is student-facing beyond `/api/auth/me`.
- **Authorization suite** (T8 second half, docs/testing/strategy.md#isolation-suite step 4): discovers every endpoint; every tutor endpoint called as a student → 403; everything outside the anonymous allowlist without a cookie → 401. A route it can't fill fails the test.
- **Isolation suite** (NFR-SEC-01, strategy step 1–3): the class exists and **discovers** `/api/me/**` and `/api/files/{id}` routes; with none in M1 it passes on an empty set but asserts the discovery runs (so M2+ endpoints are picked up automatically). `GET /api/auth/me` as a student returns no profile contact fields.
- Fixture builders: `Given.Student("Nguyễn Minh Anh")` etc., **invented data only**.

## Inputs (read these, nothing more)
- docs/architecture/api.md#students-students--identity · docs/architecture/database.md#students · docs/architecture/domain-model.md#student-account
- docs/product/requirements.md#stu--students-and-student-workspace · #auth--authentication-and-accounts (AC6–AC9)
- docs/security/security-model.md#authorization-and-student-isolation · docs/testing/strategy.md#isolation-suite · docs/backend/conventions.md#rules

## File ownership
- create/modify: `src/Keemese.Api/Program.cs` (map endpoints), `src/Keemese.Api/Infrastructure/Data/**`, `src/Keemese.Api/Modules/{Identity,Students}/**`, `tests/**`, `docs/architecture/{api,database}.md`, `progress.json`
- must not touch: `web/**`, `.github/**`

## Out of scope
Learning profile fields, goals, metrics, notes (M2). `/api/students/{id}/overview` (needs M2+ data; the workspace header uses `GET /{id}` in M1). File deletion (M3). UI (T-108/T-109).

## Verification
```bash
dotnet build -warnaserror
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests        # background
```
Evidence: counts per suite, the list of endpoints the authorization suite discovered, `not_run`.
Review: `reviewer` + `security-reviewer`. Merge needs the Lead Coordinator (student isolation).

## Status / notes
—
