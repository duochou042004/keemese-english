# Next session: T-103, password change, must-change gate, lockout, rate limits, preferences

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-103-password-lifecycle.md. Do not rely on chat history.

## State (verified 2026-10-23)
- M0 is closed. T-101 (pipeline hardening) is merged into `develop` (PR #8, eb7b49d).
- T-102 (Identity, login/logout, antiforgery, bootstrap, reset CLI) is merged into `develop` (PR #10, 2d68d91). Evidence is in progress.json.
- T-102 left: `Modules/Identity` (`AppUser`, `AuditEvent`, `IdentityService`, `IdentityEndpoints`, `AppSignInManager` which drops inactive users on every request), `Infrastructure/Security/{CurrentUser,Policies,AntiforgeryMiddleware}.cs`, the `// T-103: the must-change-password gate` slot in Program.cs, password options = length ≥ 10 only. Test helpers in `tests/Keemese.IntegrationTests/Auth.cs` (`WithTutor()`, `AsTutor()`, `CreateHttpsClient()`, `SetCookie()`); every factory gets its own database (`postgres.NewDatabase()`). New anonymous endpoints must be added to `AnonymousAllowlist` in `PipelineTests.cs` with a security review.
- **T-103 must also:** keep the dummy-hash timing on the locked-out path (`CheckPasswordSignInAsync` returns early when locked out); add length limits on login fields with the rate limiting (both from the T-102 reviews). Login is unthrottled until T-103: do not deploy before it.

## Before starting
1. T-102 is merged, so T-103 can start.
2. Check `pending_owner_actions` in progress.json: branch protection on `master`/`develop`, Dependabot security updates, OD-01/02/04/07/08.
3. Merges: within docs/agents/operating-model.md#merge-delegation only. T-103 is an authentication change: ask before merging.
4. Routine Dependabot minor/patch PRs with green CI may be merged under the delegation.

## The one next task
T-103 on its packet's branch from `develop` : change password, the must-change-password gate (FR-AUTH-AC5), lockout, login rate limits, preferences. Follow the packet exactly. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, `dotnet test tests/Keemese.UnitTests` → 11 pass, `dotnet test tests/Keemese.IntegrationTests` → 16 pass (needs Docker; run in the background), `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web` → 13 pass, `node --test ".claude/hooks/*.test.mjs"` → 13 pass, `node --test "scripts/*.test.mjs"` → 4 pass.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-103 in review with evidence recorded → ask for merge approval. Stop.
