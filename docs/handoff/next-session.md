# Next session: T-002 Frontend skeleton (after the owner approves the T-001 merge)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and docs/delivery/tasks/T-002-frontend-skeleton.md. Do not rely on chat history.

## State (verified 2026-10-19)
- `develop` @ 9f308b9 includes PR #2 (docs restructure + handoff hooks).
- Branch `feature/m0-backend-skeleton` (T-001, local; not pushed, no PR yet) **awaits the Lead Coordinator's merge approval**. It holds the .NET 10 API skeleton, the Initial migration (unaccent + f_unaccent), /health/live and /health/ready, ProblemDetails, the fallback auth policy, the compose `db` service, and unit and integration test projects.
- Evidence in progress.json: build -warnaserror 0/0, unit 10/10, integration 3/3 (Testcontainers PG 18.6), live app health 200. The reviewer approved after the evidence fix; the security-reviewer approved with low findings L1–L4.
- Tests use Microsoft.Testing.Platform (`global.json` `test.runner`); `dotnet test <project path>` works.
- Compose needs `--env-file .env` when run with `-f deploy/compose.yaml` (it otherwise reads `deploy/.env`). local-setup.md is fixed; T-002's verification command and runbooks.md still need the flag.

## Before starting
1. If `feature/m0-backend-skeleton` is not merged into develop: ask the Lead Coordinator, and do not merge it yourself. Then stop.
2. Check `pending_owner_actions` in progress.json (OD-09 blocks M1, not M0).
3. Confirm that the briefing starts with "# Session briefing" (the hooks loaded).

## The one next task
T-002: Vite 8 + React 19 + TypeScript ~6.0 SPA (TanStack Router + Query, Tailwind v4 tokens, shadcn/ui Button only, i18n vi/en), served by the API in the container build and proxied by Vite in dev. Acceptance criteria, inputs and file ownership exactly as in the packet. Branch `feature/m0-frontend-skeleton` from develop. Node 24 (the move to 26 is a separate chore after 2026-10-28). Re-verify package versions at install.
Note: Program.cs maps `/api/{**path}` → 404 ProblemDetails; the SPA fallback must not swallow `/api/*` or `/health/*`.

## Verify before building on it
`dotnet build -warnaserror` and `dotnet test tests/Keemese.UnitTests` pass on develop after the merge. `node --test ".claude/hooks/*.test.mjs"` → 13 pass.

## Carry-overs (owner to confirm the T-003/M1 placement)
- T-003: `dotnet restore --locked-mode` in CI, scripts/check-docs.mjs, progress.json schema check, PR template.
- M1: a test that enumerates anonymous endpoints; forwarded headers, HSTS, security headers, antiforgery; replace the placeholder cookie scheme with Identity.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-002 done → reviewer (+ security-reviewer), then ask for merge approval. Stop.
