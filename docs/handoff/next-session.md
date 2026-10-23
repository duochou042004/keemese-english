# Next session: T-102, Identity, login/logout, antiforgery, tutor bootstrap and reset CLI

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-102-identity-and-login.md. Do not rely on chat history.

## State (verified 2026-10-23)
- M0 is closed. The M1 packets T-101…T-110 are on `develop` (PR #7, 6d3be09) and approved (T-105 option 1; `@hookform/resolvers` allowed in T-106).
- T-101 (pipeline hardening) is merged into `develop` (PR #8, eb7b49d). Evidence is in progress.json.
- T-101 left: forwarded headers only from `ForwardedHeaders__KnownProxies` / `__KnownNetworks` (none configured = forward nothing), HSTS + HTTPS redirect outside Development/Testing, `Infrastructure/Security/SecurityHeaders.cs` (OnStarting, runs right after forwarded headers), `Cache-Control: private, no-store` on `/api/**`, and `PipelineTests` incl. the anonymous-endpoint allowlist. **New anonymous endpoints (e.g. `POST /api/auth/login`) must be added to `AnonymousAllowlist` in `tests/Keemese.IntegrationTests/PipelineTests.cs` with a security review.**

## Before starting
1. T-101 is merged, so T-102 can start.
2. Check `pending_owner_actions` in progress.json: branch protection on `master`/`develop`, Dependabot security updates, OD-01/02/04/07/08.
3. Merges: within docs/agents/operating-model.md#merge-delegation only. T-102 is an authentication change: ask before merging.
4. Routine Dependabot minor/patch PRs with green CI may be merged under the delegation.

## The one next task
T-102 on `feature/m1-identity` from `develop` (after T-101 is merged): `Modules/Identity` with `AppUser`, the `audit_events` table and one `Identity` migration; the Identity cookie per ADR-0004 replacing the placeholder scheme; `ICurrentUser` and `Policies`; login/logout + antiforgery; tutor bootstrap and the reset CLI. Follow the packet exactly. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, `dotnet test tests/Keemese.UnitTests` → 10 pass, `dotnet test tests/Keemese.IntegrationTests` → 8 pass (needs Docker; run in the background), `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web` → 13 pass, `node --test ".claude/hooks/*.test.mjs"` → 13 pass, `node --test "scripts/*.test.mjs"` → 4 pass.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-102 in review with evidence recorded → ask for merge approval. Stop.
