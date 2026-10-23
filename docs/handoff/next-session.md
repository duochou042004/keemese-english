# Next session: T-003 CI and repo automation (after the owner approves the T-002 merge)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and docs/delivery/tasks/T-003-ci-and-repo-automation.md. Do not rely on chat history.

## State (verified 2026-10-23)
- `develop` @ fc60f4d includes T-001 (PR #3).
- Branch `feature/m0-frontend-skeleton` (T-002, local; not pushed, no PR yet) **awaits the Lead Coordinator's merge approval**. It holds the Vite 8 / React 19 / TS 6.0 SPA in `web/`, the API's static files + SPA fallback (`/api/*`, `/health/*` and missing file-like paths stay 404 ProblemDetails), `deploy/Dockerfile` (non-root, DATA_DIR=/data) and the compose `app` profile.
- Evidence in progress.json: web lint/typecheck/vitest 13/13/build; build -warnaserror 0/0; unit 10/10; integration 4/4; container checks; screenshots in docs/delivery/evidence/m0/. Reviewer and security-reviewer both approved; their fixes are in.
- ESLint is pinned to 9.39 (deprecated) until eslint-plugin-jsx-a11y supports ESLint 10.

## Before starting
1. If `feature/m0-frontend-skeleton` is not merged into develop: ask the Lead Coordinator, and do not merge it yourself. Then stop.
2. Check `pending_owner_actions` in progress.json (OD-09 blocks M1, not M0). T-003 needs owner-approved GitHub settings (branch protection, secret scanning).
3. Confirm that the briefing starts with "# Session briefing" (the hooks loaded).

## The one next task
T-003 per its packet. Branch `feature/m0-ci` from develop. Carry-overs the owner was asked to place here: `dotnet restore --locked-mode` in CI, digest-pinned base images in deploy/Dockerfile, scripts/check-docs.mjs, progress.json schema check, PR template, the `--env-file .env` fix in runbooks.md.

## Verify before building on it
`dotnet build -warnaserror`, `dotnet test tests/Keemese.UnitTests`, `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web`, `node --test ".claude/hooks/*.test.mjs"` → 13 pass.

## M1 carry-overs (not T-003)
Anonymous-endpoint enumeration test; forwarded headers, HSTS, antiforgery; security headers (CSP frame-ancestors, nosniff, Referrer-Policy) before the login work; Identity replaces the placeholder cookie scheme; axe + Playwright.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-003 done → reviewer (+ security-reviewer), then ask for merge approval. Stop.
