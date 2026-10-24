# Next session: T-106, login, forced password change, session guards, Playwright + axe, e2e-smoke

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-106-login-flow-and-e2e-harness.md. Do not rely on chat history.

## State (verified 2026-10-24)
- M0 closed. T-101..T-104 and T-105 (PR #16, 23cc0cc) are merged into `develop`. Evidence is in progress.json.
- T-105 left: `web/src/api/openapi.json` (written by `dotnet build` through `Microsoft.Extensions.ApiDescription.Server`) and the generated `schema.d.ts` (`npm run api:types --prefix web`); never hand-edit either. After changing an endpoint or DTO: build, `api:types`, commit both. CI `backend` fails "API types are up to date" otherwise. New endpoints need `.Produces<T>()` or the document has no response type (docs/testing/ci.md#api-types-t-105).
- `web/src/api/client.ts`: `apiFetch` (XSRF header on unsafe methods, JSON `body`, ProblemDetails → `ApiError.code`) and a typed `api(method, path, { params, query, body })`. A 401 (except login/me) calls the handler registered in `web/src/main.tsx` (clears the query cache, navigates to `/login?redirect=`). `web/src/lib/redirect.ts`: `safeRedirect(target, role)` for the login page.
- `openapi-typescript` 7.13.0 needs an npm `overrides` for its `typescript ^5.x` peer (TS 6.0.3 pinned); recheck on updates.
- gitleaks flags invented password literals assigned to `*Password` names. Avoid them or add the reviewed fingerprint to `.gitleaksignore`.
- Windows: a local Application Control policy blocks native binaries at random (Debug/Release test exes, rolldown's `.node` for vitest). Run checks in Linux containers when blocked: web `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/keemese-english:/repo" -v keemese-web-nm:/repo/web/node_modules -w /repo/web node:24-alpine sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"`; .NET in `mcr.microsoft.com/dotnet/sdk:10.0` on a copied tree (exclude bin/obj/node_modules), Testcontainers via `-v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal --add-host host.docker.internal:host-gateway`.
- The guard hook blocked a subagent's `docker run --rm …` as a recursive delete (reported to the owner).

## Before starting
1. Check `pending_owner_actions` in progress.json.
2. Merges: docs/agents/operating-model.md#merge-delegation only. T-106 is authentication UI + CI (L4): ask before merging.

## The one next task
T-106 on `feature/m1-login-flow` from `develop`. Follow the packet: login page (React Hook Form + Zod + `@hookform/resolvers`, approved), forced change-password, guards replacing `requireSession`, logout, Playwright + axe, the `e2e-smoke` job. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, unit 27, integration 37, web vitest 44 (Linux container, 2026-10-24), `node --test ".claude/hooks/*.test.mjs"` → 13, `node --test "scripts/*.test.mjs"` → 4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-106 in review with evidence recorded → ask for merge approval. Stop.
