# T-106: Login, forced password change, session guards, Playwright + axe and the e2e-smoke job

- Milestone: M1 · Ladder level: L4 (routing, guards, CI) · Depends on: T-103 and T-105 merged · Branch: `feature/m1-login-flow` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: not_started

## Objective
A tutor and a student can log in through the real UI, are forced to change a temporary password, land in their role's area, and log out; the first E2E scenario (`E2E-AUTH`) runs with axe in CI.

## Requirements / acceptance criteria
- **`/login`** wired to `POST /api/auth/login` with React Hook Form + Zod (ADR-0014; adds `react-hook-form`, `zod`, `@hookform/resolvers` as exact versions; the last one needs the Lead Coordinator's OK as it is not named in the ADR). "Remember me" checkbox. Generic error for invalid credentials, distinct copy for 429. No "Sign up" link (FR-AUTH-AC3). Honors a validated `?redirect=` (T-105 `safeRedirect`).
- **`/change-password`**: forced (after login when `mustChangePassword`) and voluntary. Current + new + confirm; shows the policy (≥ 10 characters); maps `password.too_short` / `password.too_common` / `auth.invalid_current_password` to field messages (FR-AUTH-04, -05).
- **Guards** replace the placeholder `requireSession` (`web/src/lib/guard.ts`): `GET /api/auth/me` through TanStack Query (`['me']`); anonymous → `/login?redirect=`; `mustChangePassword` → `/change-password` from any route; tutor ↔ `/t/*`, student ↔ `/s/*`, the wrong role → its own home; `/` redirects by role (docs/frontend/information-architecture.md#routes). Logout (temporary button in the existing `/t` and `/s` shells; the AppShell account menu is T-107) calls the API, clears the query cache and goes to `/login` (T18).
- **Language (FR-AUTH-08, FR-UX-01):** after login the UI uses `me.language`; switching language while signed in calls `PUT /api/auth/preferences`. Before login the `lang` localStorage fallback stays.
- **i18n:** every new string in `vi` and `en` (`auth.json` namespace or `common.json`); the parity test covers it.
- **Component tests:** add `@testing-library/react`, `jsdom`, `msw` (ADR-0013). Login form: validation, error codes → messages. Change-password form: policy errors.
- **Playwright + axe (ADR-0013):** `@playwright/test` and `@axe-core/playwright` (exact), `web/playwright.config.ts` (Chromium in PRs), `web/e2e/fixtures/seed.ts` (seeds through the real API with the E2E-only bootstrap tutor from env vars; invented data), an axe check helper that fails on serious/critical on every page visit, scripts `e2e` and `e2e:reset`.
- **`E2E-AUTH` (@smoke):** bootstrap tutor logs in → forced change → `/t`; logout → back button → still `/login`; a student created via the API logs in → forced change → `/s`; a wrong password shows the generic error.
- **CI `e2e-smoke` job** per docs/testing/ci.md: runs when `backend` or `web` changed; Compose up (db + app image built in the job, E2E bootstrap env, no secrets); Playwright Chromium `@smoke` + tags for changed areas; browsers cached by Playwright version; on failure only, upload the report and traces (`retention-days: 5`). Update ci.md and the PR template if needed. **Ask the owner to add `e2e-smoke` to the required checks** (owner setting).

## Inputs (read these, nothing more)
- docs/frontend/information-architecture.md#routes · docs/frontend/ux-journeys.md#journey--e2e-mapping · docs/frontend/design-system.md
- docs/decisions/0004, 0008, 0013, 0014 · docs/testing/ci.md · docs/testing/strategy.md#fixtures-and-data
- docs/security/threat-model.md (T18) · `web/src/routes/**`, `web/src/lib/guard.ts`, `web/src/api/**`

## File ownership
- create/modify: `web/**` (except `web/src/components/ui/**` beyond adding the shadcn components the forms need: Input, Label, Checkbox, Form), `.github/workflows/ci.yml` (e2e-smoke job), `.github/pull_request_template.md`, `deploy/compose.yaml` (E2E env only, if needed), `docs/testing/ci.md`, `progress.json`
- must not touch: `src/**`, `tests/**`

## Out of scope
AppShell navigation and dashboards (T-107). Student management UI (T-108).

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
docker compose --env-file .env -f deploy/compose.yaml --profile app up --build -d --wait   # background
npm run e2e --prefix web                                                                   # background
```
Plus the PR's CI run with `e2e-smoke` green and one deliberately failing E2E commit (reverted) proving the failure-only artifact. Screens `/login` and `/change-password` at 1440/1024/768/390 × vi/en.
Review: `reviewer` (L4, incl. visual check) + `security-reviewer` (guards, redirects, CI). Merge needs the Lead Coordinator (authentication UI).

## Status / notes
—
