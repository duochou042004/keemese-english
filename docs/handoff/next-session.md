# Next session: T-001 Backend skeleton (after the owner approves PR #2)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and docs/delivery/tasks/T-001-backend-skeleton.md. Do not rely on chat history.

## State (verified 2026-10-17)
- `develop` = Phase 1 planning baseline (merged via PR #1, merge commit 60831a6). `master` = spec import only (adf3770). Public repo: github.com/duochou042004/keemese-english.
- Branch `feature/docs-restructure-handoff` → **PR #2 into develop, awaiting the Lead Coordinator's approval**. It contains:
  - spec files moved to `docs/spec/` (git renames; ADR-0001 amended)
  - token-based handoff tiers: WARN 250k · HANDOFF 320k · HARD STOP 400k · never 500k (docs/agents/handoff.md, progress.json policy.context)
  - hooks: `.claude/hooks/context-monitor.mjs` (injects tier warnings), `session-start.mjs` (repository briefing), plus `.claude/statusline.mjs`
  - evidence: `node --test ".claude/hooks/*.test.mjs"` → 13/13 pass; internal link check → 0 problems; the monitor measured the previous session live (~377–390k tokens)
- No product code exists yet. No CI yet (T-003).

## Before starting
1. If PR #2 is not merged: ask the Lead Coordinator to approve it, and do not merge it yourself without explicit approval. Then stop.
2. Check `pending_owner_actions` in progress.json: the go-ahead for T-001, and the OD answers (OD-09 blocks M1, not M0).
3. Confirm that the hooks fired: your briefing should start with "# Session briefing". If not, the hooks are not loaded. Tell the user (check with `/hooks` in a `claude` terminal).

## The one next task
T-001: a buildable, testable .NET 10 backend skeleton (minimal API host, AppDbContext + initial migration with unaccent/f_unaccent, /health/live + /health/ready, ProblemDetails, compose `db` service on postgres:18.6-alpine, .env.example, unit and Testcontainers integration test projects with one real test each).
Acceptance criteria, inputs and file ownership: exactly as in the packet. Branch `feature/m0-backend-skeleton` from `develop`. No packages beyond the packet; re-verify versions at install.

## Verify before building on it
`node --test ".claude/hooks/*.test.mjs"` → 13 pass. `git log develop --oneline -3` shows the PR #2 merge.

## Required verification (L4)
dotnet build -warnaserror; dotnet test tests/Keemese.UnitTests; docker compose -f deploy/compose.yaml up -d db; dotnet test tests/Keemese.IntegrationTests (background); dotnet run, then GET /health/ready → 200. Record evidence in progress.json. Note that Podman was not tested.

## Follow-ups proposed (not started; fold them into T-003 if the owner agrees)
Move the internal link checker into `scripts/check-docs.mjs` (instead of a third-party link-check action), validate progress.json against a small schema in CI, and add a PR template with the ladder level, evidence and docs checklist.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. T-001 done → reviewer subagent, then ask for merge approval. Stop.
