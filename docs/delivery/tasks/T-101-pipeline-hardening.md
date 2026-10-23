# T-101: Request pipeline hardening and the anonymous-endpoint test

- Milestone: M1 · Ladder level: L4 (security pipeline) · Depends on: M0 closed · Branch: `feature/m1-pipeline-hardening` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: not_started

## Objective
Before any login code exists, the app sends the security headers, trusts forwarded headers only from configured proxies, uses HSTS outside development, and has a test that fails when an endpoint has no explicit authorization decision.

## Requirements / acceptance criteria
- Pipeline order as in docs/architecture/overview.md#request-pipeline-order-matters, steps 1–3 (forwarded headers → HTTPS redirect/HSTS → security headers → static files). Later steps stay where they are.
- **Forwarded headers:** `UseForwardedHeaders` for `X-Forwarded-For` and `X-Forwarded-Proto`, trusted only from proxies listed in config (`ForwardedHeaders__KnownProxies` / `KnownNetworks`; empty by default = trust nobody). Documented in `.env.example` (placeholder only) and docs/operations/deployment.md.
- **HTTPS/HSTS:** `UseHsts` + `UseHttpsRedirection` outside Development and Testing. HSTS max-age 180 days, no preload. The container behind a TLS proxy still works (redirect decision uses the forwarded proto).
- **Security headers** on every response (API, SPA, errors) exactly as docs/security/security-model.md#web-security-headers-app: the CSP string verbatim (incl. `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=()`. One small middleware in `Infrastructure/Security/SecurityHeaders.cs`; no package.
- **`Cache-Control: private, no-store`** on `/api/**` responses (threat T18). SPA cache headers from T-002 stay unchanged.
- **`AllowedHosts`:** stays `*` in `appsettings.json` (the host is unknown until OD-06) but is overridable by env (`AllowedHosts`); note this in deployment.md.
- **Anonymous-endpoint enumeration test** (security-reviewer T-001 finding L1, threat T8 first half): an integration test reads `EndpointDataSource`, and for every endpoint asserts it has either `IAllowAnonymous` metadata **and** is on an explicit allowlist (`/health/live`, `/health/ready`, the fallbacks, dev-only `/openapi/*`), or an authorization policy. A new anonymous endpoint not on the list fails the test.
- Integration tests: headers present on `/login` (SPA), `/api/nope` (404 problem) and `/health/live`; CSP equals the documented string; no HSTS in Testing; HSTS present when the environment is Production (a second factory or `UseEnvironment("Production")` with a test connection string).

## Inputs (read these, nothing more)
- docs/architecture/overview.md#request-pipeline-order-matters
- docs/security/security-model.md#web-security-headers-app · docs/security/threat-model.md (T2, T8, T18)
- docs/operations/deployment.md · `src/Keemese.Api/Program.cs` · `tests/Keemese.IntegrationTests/*`

## File ownership
- create/modify: `src/Keemese.Api/Program.cs`, `src/Keemese.Api/Infrastructure/Security/**`, `src/Keemese.Api/appsettings*.json`, `tests/Keemese.IntegrationTests/**`, `.env.example`, `docs/operations/deployment.md`, `docs/security/security-model.md` (corrections only), `progress.json`
- must not touch: `web/**`, `.github/**`, `Modules/**`

## Out of scope
Identity, antiforgery and rate limiting (T-102/T-103), the authenticated half of T8 (every tutor route as a student → 403, T-104), CSP nonces (the SPA has no inline scripts; keep it that way).

## Verification
```bash
dotnet build -warnaserror
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests        # background
docker compose --env-file .env -f deploy/compose.yaml --profile app up --build -d --wait   # background; curl -I localhost:8080/login and /api/nope → headers
```
Evidence: test counts, the `curl -I` header lines from the container, and `not_run` (Podman, a real TLS proxy).
Review: `reviewer` + `security-reviewer` (L4). Merge needs the Lead Coordinator (security change, see merge delegation).

## Status / notes
—
