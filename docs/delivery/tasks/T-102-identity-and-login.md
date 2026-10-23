# T-102: Identity, login/logout, antiforgery, tutor bootstrap and reset CLI

- Milestone: M1 · Ladder level: L4 (authentication) · Depends on: T-101 merged · Branch: `feature/m1-identity` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: in_review

## Objective
ASP.NET Core Identity replaces the placeholder cookie scheme: the bootstrapped tutor can log in and out through the API, the session cookie and antiforgery follow ADR-0004, and an operator can reset the tutor's password from the CLI.

## Requirements / acceptance criteria
- **Module `Modules/Identity`** per docs/backend/conventions.md#layout: `AppUser` (`IdentityUserContext<AppUser, Guid>`, no role tables), columns as docs/architecture/database.md#identity (`role`, `display_name`, `preferred_language`, `must_change_password`, `is_active`, `last_login_at`), check constraints on role/language, **partial unique index on `role` WHERE `role = 'tutor'`** (FR-AUTH-AC4, T9). `audit_events` table (append-only, `created_at` only). One migration `Identity`. UUID v7 IDs. A `created_at`/`updated_at` interceptor (`Infrastructure/Data/AuditInterceptor.cs`) if none exists yet.
- **Cookie (ADR-0004):** Identity application cookie replaces the placeholder in `Program.cs`. HttpOnly, `Secure` except plain-HTTP Development, `SameSite=Lax`, name `__Host-keemese` outside Development, sliding 8 h (30 days with `rememberMe`), 401/403 ProblemDetails (`auth.unauthenticated`, `auth.forbidden`) instead of redirects. `SecurityStampValidatorOptions.ValidationInterval = TimeSpan.Zero`. Data Protection keys persisted to `DATA_DIR/keys`.
- **`Infrastructure/Security`:** `ICurrentUser` (`UserId`, `Role`, `StudentId` throws unless student), `Policies` (`Tutor`, `Student`; fallback = authenticated **and active**). `PasswordChangeGate` is T-103; leave the pipeline slot.
- **Endpoints** (docs/architecture/api.md#auth-and-account-any-signed-in-user): `POST /api/auth/login` (anonymous), `POST /api/auth/logout`, `GET /api/auth/me` → `{id, role, displayName, language, mustChangePassword}`. `POST /api/auth/register` and any sign-up path → 404 (FR-AUTH-AC3; the existing `/api` fallback covers it, assert it).
- **FR-AUTH-AC1:** valid credentials → 204 + cookie; unknown user and wrong password → the same `401 auth.invalid_credentials` with similar timing (hash a dummy password on unknown users). A deactivated user → the same generic error. `last_login_at` set. `auth.login_succeeded` / `auth.login_failed` audit events (IDs only, `ip_hash` = SHA-256(IP + `Security__IpHashSalt`)).
- **Antiforgery (T3):** after login (and on `GET /api/auth/me`) issue the readable `XSRF-TOKEN` cookie; `AntiforgeryMiddleware` validates `X-XSRF-TOKEN` on POST/PUT/PATCH/DELETE for cookie-authenticated requests → 400 `auth.antiforgery_failed`. Logout clears the auth cookie and rotates the token.
- **Tutor bootstrap (FR-AUTH-03, AC4):** on startup, if no tutor exists and `BOOTSTRAP_TUTOR_USERNAME` + `BOOTSTRAP_TUTOR_PASSWORD` are set → create the tutor with `must_change_password = true`, log `tutor bootstrap: created` (no values). Tutor exists → no-op + warning. No HTTP endpoint.
- **Operator CLI (FR-AUTH-AC9, T19, docs/operations/runbooks.md):** `dotnet Keemese.Api.dll --reset-tutor-password` sets a new 12-character temporary password (unambiguous alphabet), sets `must_change_password`, clears lockout, rotates the security stamp, prints the password **once** to stdout, logs only that a reset happened, and exits without starting the web host.
- Test helpers in IntegrationTests: `AsTutor()` (bootstraps via config, logs in through the API, handles XSRF), plus a per-test DB cleanup if not already present.
- Tests (integration): login ok/bad/unknown/deactivated, cookie flags, `me` 401 when anonymous, POST without XSRF → 400, logout ends the session, register → 404, a second tutor insert violates the index, bootstrap twice = one tutor, the CLI resets and clears lockout. Unit: temporary-password generator alphabet and length.

## Inputs (read these, nothing more)
- docs/decisions/0004-cookie-auth-same-origin.md · docs/security/security-model.md#authentication, #tutor-bootstrap
- docs/architecture/database.md#identity · docs/architecture/api.md#auth-and-account-any-signed-in-user · docs/backend/conventions.md
- docs/product/requirements.md#auth--authentication-and-accounts (AC1, AC3, AC4, AC9) · docs/operations/runbooks.md

## File ownership
- create/modify: `src/Keemese.Api/**` (Program.cs, `Infrastructure/**`, `Modules/Identity/**`, `Shared/**`, csproj + `Directory.Packages.props` for `Microsoft.AspNetCore.Identity.EntityFrameworkCore` only), `tests/**`, `deploy/compose.yaml` and `.env.example` (bootstrap/salt placeholders), `docs/architecture/{api,database}.md`, `docs/operations/runbooks.md` (corrections), `progress.json`
- must not touch: `web/**`, `.github/**`

## Out of scope
Change password, the must-change gate, lockout, rate limiting, password policy, preferences (T-103). Student accounts (T-104). Any UI.

## Verification
```bash
dotnet build -warnaserror
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests        # background
docker compose --env-file .env -f deploy/compose.yaml --profile app up --build -d --wait   # background; curl login with the bootstrap tutor → 204 + Set-Cookie flags
docker compose --env-file .env -f deploy/compose.yaml exec app dotnet Keemese.Api.dll --reset-tutor-password
```
Evidence: counts, cookie flags seen, CLI output **without the password value**, `not_run`.
Review: `reviewer` + `security-reviewer`. Merge needs the Lead Coordinator (authentication).

## Status / notes
- 2026-10-23: implemented on `feature/m1-identity`; reviewer and security-reviewer approve (Low/Info only). Password options are length ≥ 10 with no composition rules (Identity's defaults would reject the bootstrap and temporary passwords); the common-password list stays in T-103. "Active" is enforced in `AppSignInManager.ValidateSecurityStampAsync` (every request). Integration tests use a database per factory. **For T-103:** hash on the locked-out path too (`CheckPasswordSignInAsync` returns early when locked out); add login field length limits with rate limiting. Evidence: progress.json.
