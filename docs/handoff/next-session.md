# Next session: T-101, request pipeline hardening (first M1 task)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-101-pipeline-hardening.md. Do not rely on chat history.

## State (verified 2026-10-23)
- M0 is closed (`develop` 5341aa4; ci push run 39976019505 green).
- OD-09 (navigation) was accepted as proposed on 2026-10-23 and is now PD-08.
- The M1 packets T-101…T-110 are on `chore/m1-packets` (index and order: docs/delivery/tasks/README.md#index). **They need Lead Coordinator approval and the packets PR merged into `develop` before any implementation.** Open owner questions in the packets: T-105 option 1 (build-time `Microsoft.Extensions.ApiDescription.Server`) vs option 2 (no package); T-106 adding `@hookform/resolvers`.

## Before starting
1. Check `pending_owner_actions` in progress.json: packet approval, branch protection on `master`/`develop` and Dependabot security updates (owner settings), OD-01/02/04/07/08.
2. If the packets PR is not merged yet, ask the Lead Coordinator; don't start T-101 on an unapproved packet.
3. Merges: within docs/agents/operating-model.md#merge-delegation only. T-101 is a security change: ask before merging.
4. Routine Dependabot minor/patch PRs with green CI may be merged under the delegation.

## The one next task
T-101 on `feature/m1-pipeline-hardening` from `develop`: forwarded headers (configured proxies only), HTTPS redirect + HSTS outside Development/Testing, the security headers middleware (CSP verbatim from docs/security/security-model.md, nosniff, Referrer-Policy, Permissions-Policy), `Cache-Control: private, no-store` on `/api/**`, and the anonymous-endpoint enumeration test. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, `dotnet test tests/Keemese.UnitTests` → 10 pass, `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web` → 13 pass, `node --test ".claude/hooks/*.test.mjs"` → 13 pass, `node --test "scripts/*.test.mjs"` → 4 pass. Integration tests (4) need Docker: run them in the background.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-101 in review with evidence recorded → ask for merge approval. Stop.
