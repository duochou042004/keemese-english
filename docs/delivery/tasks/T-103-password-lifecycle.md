# T-103: Password change, must-change gate, lockout, rate limits, preferences

- Milestone: M1 · Ladder level: L4 (authentication) · Depends on: T-102 merged · Branch: `feature/m1-password-lifecycle` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: in_review

## Objective
Users can change their password and save their language, a user with a pending password change can do nothing else, and brute force and lockout abuse are contained.

## Requirements / acceptance criteria
- **`POST /api/auth/change-password`** `{currentPassword, newPassword}` → 204 (FR-AUTH-05). Clears `must_change_password`, rotates the security stamp so **other** sessions end (FR-AUTH-AC6), and re-issues the caller's cookie. Wrong current password → 400 `auth.invalid_current_password`.
- **Password policy** (docs/security/security-model.md#authentication): ≥ 10 characters, no composition rules, rejected if in a small embedded common-password list (a text resource, ≤ ~10k entries, from a permissively licensed source noted in the file header) → `validation.failed` with `password.too_short` / `password.too_common`. Same validator for create/reset in T-104.
- **`PasswordChangeGate`** (FR-AUTH-AC5): after authorization, a user with `must_change_password` gets `403 auth.password_change_required` on everything except `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout`. API-enforced; tested with the bootstrapped tutor (who starts with the flag).
- **Lockout** (FR-AUTH-AC2): 5 failures → 15 minutes; a locked account gets the generic `auth.invalid_credentials` (the login page must not confirm a username exists, T19), and the lockout writes an `auth.locked_out` audit event. Login while locked does not reset the timer.
- **Rate limiting** (T1, T19): built-in `RateLimiter`; login 5/min per IP and 20/h per username → 429 `auth.rate_limited`. Rejected requests do not count toward lockout (the limiter runs before the sign-in attempt). Partitioning uses the forwarded client IP from T-101.
- **`PUT /api/auth/preferences`** `{language: "vi"|"en"}` → 204 (FR-AUTH-08); `me` returns it.
- Tests (integration, `FakeTimeProvider` where time matters): change-password ok/wrong-current/too-short/too-common; other session 401 after change; gate blocks a tutor route and allows the 3 exceptions; 5 failures → locked, 15 min later → ok; 6th request in a minute → 429 and does not increment `access_failed_count`; preferences round-trip. Unit: the policy validator.

## Inputs (read these, nothing more)
- docs/security/security-model.md#authentication, #principals-and-policies · docs/security/threat-model.md (T1, T19)
- docs/product/requirements.md#auth--authentication-and-accounts (AC2, AC5, AC6) · docs/architecture/api.md#auth-and-account-any-signed-in-user
- The T-102 code in `Modules/Identity` and `Infrastructure/Security`

## File ownership
- create/modify: `src/Keemese.Api/Program.cs`, `src/Keemese.Api/Infrastructure/Security/**`, `src/Keemese.Api/Modules/Identity/**`, `tests/**`, `docs/architecture/api.md`, `docs/security/security-model.md` (corrections), `progress.json`
- must not touch: `web/**`, `.github/**`, other modules

## Out of scope
Student creation, reset and unlock endpoints (T-104). UI (T-106).

## Verification
```bash
dotnet build -warnaserror
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests        # background
```
Evidence: counts per area, `not_run` (e.g. real proxy IP partitioning).
Review: `reviewer` + `security-reviewer`. Merge needs the Lead Coordinator (authentication).

## Status / notes
- 2026-10-24: implemented on `feature/m1-password-lifecycle`. Deviations: the limiter is `System.Threading.RateLimiting` called inside `LoginAsync` (the username partition needs the parsed body, and it must run before the password check), not the RateLimiter middleware; the 15-minute test moves `lockout_end` instead of using `FakeTimeProvider` (Identity 10 reads the system clock for lockout); no tutor route exists before T-104, so the gate is tested on `PUT /api/auth/preferences` and an unmapped `/api` path; `Shared/Errors/AppError.cs` gained the `validation.failed` `errors` map (outside the file list).
- Local Windows note: an Application Control policy randomly blocks the Debug `Keemese.Api.dll` (per binary hash); `-c Release` test runs load. Not a code issue.
