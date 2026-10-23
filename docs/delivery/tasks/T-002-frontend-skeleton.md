# T-002: Frontend skeleton served by the API

- Milestone: M0 · Ladder level: L4 (router, query, shell foundations) · Depends on: T-001 merged · Branch: `feature/m0-frontend-skeleton`
- Status: in_review (2026-10-23)

## Objective
A Vite + React + TypeScript SPA with the chosen foundations wired (router, query, Tailwind tokens, i18n), served by the API from one origin in the container build, and proxied by Vite in development.

## Requirements / acceptance criteria
- ADR-0012: `web/package.json` with `engines.node` `>=24.11 <25`, `packageManager` npm 11.x, an **exact** `package-lock.json`. `.nvmrc` = `24`. TypeScript `~6.0`.
- ADR-0005/0006/0014: Vite 8, React 19, `@tanstack/react-router` (file-based routes via its Vite plugin), `@tanstack/react-query`, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui initialized (Radix) with **only** the components this task uses (Button at minimum), Inter Variable via `@fontsource-variable/inter`.
- `web/src/styles/theme.css`: tokens from docs/frontend/design-system.md#tokens (colors, type scale, spacing, radius).
- Routes: `/` (redirect placeholder), `/login` (static form, not wired to auth: M1), `/t` and `/s` empty shells behind a placeholder guard that **always redirects to /login** (no fake auth), and a 404 route.
- ADR-0008: i18next + react-i18next with `vi` (default) and `en` catalogs (`common.json`, `errors.json`), a language switcher on `/login`, the `lang` localStorage fallback, and a Vitest **catalog parity test**.
- An API `fetch` wrapper skeleton: same-origin credentials, ProblemDetails → error code. No XSRF yet (M1).
- ESLint (typescript-eslint, react-hooks, jsx-a11y, a rule banning `dangerouslySetInnerHTML`) + Prettier. Scripts: `dev`, `build`, `lint`, `typecheck`, `test`.
- `vite.config.ts` proxy `/api` and `/health` → `http://localhost:5080`.
- `deploy/Dockerfile` (multi-stage: Node 24 build → .NET SDK publish → `aspnet:10.0` runtime, non-root, `DATA_DIR=/data`) and the `app` profile in `deploy/compose.yaml`. The API serves `wwwroot` static files + SPA fallback (non-`/api` routes → `index.html`, `Cache-Control: no-cache` for index, immutable for hashed assets).
- Visual check: `/login` at 1440/1024/768/390 in vi and en: no horizontal scroll, legible diacritics. Screenshots are kept in `docs/delivery/evidence/m0/`, using no real data.

## Inputs
- docs/frontend/{information-architecture,design-system}.md · docs/decisions/0005, 0006, 0008, 0012, 0014 · docs/operations/local-setup.md

## File ownership
- create/modify: `web/**`, `.nvmrc`, `deploy/Dockerfile`, `deploy/compose.yaml` (add `app` profile), `src/Keemese.Api/Program.cs` (static files + SPA fallback only), `docs/delivery/evidence/m0/**`, `progress.json`
- must not touch: other `src/**`, `tests/**` except one integration test for the SPA fallback, `.github/**`

## Out of scope
Authentication, real pages, the API types generator (it arrives with the first real endpoint in M1), Playwright (M1).

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
docker compose --env-file .env -f deploy/compose.yaml --profile app up --build   # background; GET http://localhost:8080/login → SPA; /health/ready → 200
dotnet test tests/Keemese.IntegrationTests --filter SpaFallback
```
Review: `reviewer` (L4) including the visual check.

## Status / notes
- ESLint is pinned to 9.39 (npm marks it deprecated): `eslint-plugin-jsx-a11y` 6.10 does not support ESLint 10 yet. Upgrade both together when it does.
- The Tailwind default palette, type scale and radii are reset in `theme.css`; only the semantic tokens exist, so off-system colors fail to compile into classes.
- Integration test `SkeletonTests` no longer asserts `/anything-else` → 401: that path is now the SPA. `SpaFallbackTests` covers client routes, cache headers and `/api/*` + `/health/*` misses.
- `deploy/Dockerfile.dockerignore` (BuildKit's per-Dockerfile ignore) keeps `bin/`, `obj/`, `node_modules/` and `.env*` out of the build context.
- Screenshots in `docs/delivery/evidence/m0/` were captured from the container build with headless Edge over CDP (invented placeholder text only).
