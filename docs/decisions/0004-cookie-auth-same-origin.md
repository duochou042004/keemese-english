# ADR-0004: Same-origin cookie authentication with ASP.NET Core Identity

Status: Accepted (2026-10-17)

## Context
The spec allows "JWT or cookie" (§36). The baseline forbids long-lived credentials in `localStorage`. The client is our own SPA, and we control where it is served from.

## Decision
- **ASP.NET Core Identity** (`IdentityUserContext<AppUser, Guid>`, no role tables). A `Role` column (`tutor` | `student`) has a partial unique index that allows only one tutor.
- **Cookie authentication**, same origin. The production SPA is served by the API (ADR-0005); in development the Vite dev server proxies `/api` to Kestrel. **No CORS configuration exists.**
- Cookie settings: `HttpOnly`, `Secure` (except plain-HTTP local development), `SameSite=Lax`, name `__Host-keemese` in production. Sliding expiration of 8 hours, or 30 days with "remember me".
- **Antiforgery**: a token is issued after login in a readable `XSRF-TOKEN` cookie. The SPA sends it in an `X-XSRF-TOKEN` header. Middleware validates it on every unsafe method (POST, PUT, PATCH, DELETE) for cookie-authenticated requests.
- Security stamp validation on **every request** (`SecurityStampValidatorOptions.ValidationInterval = TimeSpan.Zero`), so a password change, reset or deactivation ends existing sessions on their next request. That's one indexed user lookup per request, negligible at this scale.
- Data Protection keys persist to the data volume (`/data/keys`), so restarts don't log everyone out.
- API returns `401` / `403` with ProblemDetails, never redirects to a login page.

## Alternatives
- JWT access token + refresh token: the token has to live in JavaScript memory or storage, refresh needs its own revocation logic, and the threat model is wider. It only pays off with third-party clients, and we have none.
- BFF with a separate gateway: we already *are* the backend for our frontend.

## Consequences
- The SPA and API must share an origin in every environment. A deployment that splits them would require a new ADR (cross-site cookies, CORS).
- E2E tests log in through the real form once per role and reuse Playwright `storageState`.

## Revisit when
A native mobile app or a third-party integration needs API access.
