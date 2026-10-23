# Next session: T-104, students API, account actions, isolation and authorization suites

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-104-students-api-and-isolation-suite.md. Do not rely on chat history.

## State (verified 2026-10-24)
- M0 closed. T-101 (PR #8), T-102 (PR #10) and T-103 (PR #12, cee9a58) are merged into `develop`. Evidence is in progress.json.
- T-103 left: `PasswordPolicy` (Identity's only password validator: 10-256 chars + embedded common list; reuse it for student create/reset), `PasswordChangeGate` (endpoints opt in with `.AllowDuringPasswordChange()`; the claim is rebuilt from the DB every request), `LoginRateLimiter` (in memory; IPv6 per /64), lockout 5 → 15 min, `AppError.Validation(field, code)` for `validation.failed`. Test helpers in `tests/Keemese.IntegrationTests/Auth.cs`: `WithTutor()`, `AsTutor()`, `WithClientIps()` + `FromIp()` (the per-IP login limit is 5/min, so tests doing more logins must vary the IP), `UseXsrfToken()`. The bootstrapped tutor starts with `mustChangePassword`, so tutor-route tests must change the password first (see `PasswordLifecycleTests`).
- New anonymous endpoints need a security review and an entry in `AnonymousAllowlist` (`PipelineTests.cs`).
- Windows note: a local Application Control policy randomly blocks the Debug `Keemese.Api.dll`; run tests with `-c Release` if loading fails.

## Before starting
1. Check `pending_owner_actions` in progress.json (branch protection, Dependabot security updates, OD-01/02/04/07/08, the threat-model T19 follow-up).
2. Merges: docs/agents/operating-model.md#merge-delegation only. T-104 touches authorization and student data: ask before merging.

## The one next task
T-104 on `feature/m1-students-api` from `develop`. Follow the packet exactly. Then reviewer + security-reviewer, evidence in progress.json, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
`dotnet build -warnaserror` → 0/0, `dotnet test tests/Keemese.UnitTests -c Release` → 27 pass, `dotnet test tests/Keemese.IntegrationTests -c Release` → 25 pass (Docker; background), `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web` → 13 pass, `node --test ".claude/hooks/*.test.mjs"` → 13, `node --test "scripts/*.test.mjs"` → 4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-104 in review with evidence recorded → ask for merge approval. Stop.
