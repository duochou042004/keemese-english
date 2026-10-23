# Next session: close M0, then plan M1 (after the owner approves the T-003 merge)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and docs/delivery/milestones.md (M1 row). Do not rely on chat history.

## State (verified 2026-10-23)
- `develop` @ fc3704e includes T-001 (PR #3) and T-002 (PR #4).
- T-003 is on `feature/m0-ci`, PR #5 → develop, **awaiting the Lead Coordinator's merge approval**. It adds `.github/workflows/ci.yml` (changes, backend, web, docs, secrets), `compat.yml` (Windows/macOS; weekly, manual, or the `compat` PR label), `dependabot.yml`, the PR template, `scripts/check-docs.mjs` + `scripts/check-progress.mjs` (+ node tests), digest-pinned Dockerfile bases and the runbooks `--env-file` fix.
- Evidence in progress.json: ci green on PR #5 (run 39974366296), compat green on Windows and macOS (run 39974389861), the failure-only TRX artifact proven with a reverted failing test (5-day retention), gitleaks full history clean. Reviewer and security-reviewer done; their fixes are in.

## Before starting
1. If PR #5 is not merged into develop: ask the Lead Coordinator, and do not merge it yourself. Then stop.
2. After the merge, delete `feature/m0-ci` locally and on origin.
3. Owner settings still pending (owner does them or approves each): branch protection on `master` and `develop` (require a PR + the ci checks `changes`, `backend`, `web`, `docs`, `secrets`; 0 required approvals; no force-push or deletion) and Dependabot security updates. Secret scanning and push protection are already on. M0 closes when CI is green on develop after the merge: check the push run.
4. OD-09 (navigation) blocks M1. Check `pending_owner_actions`.

## The one next task
Once OD-09 is answered: write the M1 task packets (T-101…) in docs/delivery/tasks/ from the M1 row in milestones.md, sized one per session, using T-001..T-003 as the format. Include the M1 carry-overs: anonymous-endpoint enumeration test; forwarded headers, HSTS, antiforgery; security headers (CSP frame-ancestors, nosniff, Referrer-Policy) before the login work; Identity replaces the placeholder cookie scheme; axe + Playwright with the `e2e-smoke` CI job; the API-types-up-to-date CI step with the first generated client. Ask the Lead Coordinator to approve the packets before implementing.

## Verify before building on it
`dotnet build -warnaserror`, `dotnet test tests/Keemese.UnitTests`, `npm ci --prefix web && npm run lint --prefix web && npm test --prefix web`, `node --test ".claude/hooks/*.test.mjs"` → 13 pass, `node --test "scripts/*.test.mjs"` → 4 pass.

## Stop conditions
Context ≥ 320k (context-monitor says HANDOFF) → handoff per docs/agents/handoff.md. Packets written → ask for approval. Stop.
