# Next session: T-110, M1 milestone gate

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
The SessionStart briefing shows live state. Read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-110-m1-gate.md. Do not rely on chat history.

## State (verified 2026-10-24)
- T-101..T-109 are merged into `develop`. T-109 (PR #25, bfd8df6) added `/t/students/$studentId` (Overview, Profile tabs), profile editing with `version` + 409 Reload, parents, and account actions (reset, unlock, archive with Undo, restore, delete with typed name). Evidence is in progress.json.
- Student UI: `web/src/features/students/` (Workspace, Profile, AccountActions, StudentFields shared with AddStudent, toast.tsx = a `shortcut:` store instead of sonner). E2E: `web/e2e/{auth,students,workspace}.spec.ts` = E2E-AUTH (3), E2E-J2, E2E-ISO, all `@smoke`.
- E2E: `npm run e2e:reset --prefix web` (fresh `keemese-e2e` stack; ports 5432/8080), then `npm run e2e --prefix web`. Without a repository `.env`, export throwaway BOOTSTRAP_TUTOR_USERNAME, BOOTSTRAP_TUTOR_PASSWORD, POSTGRES_PASSWORD and Security__IpHashSalt in the same shell for both (and for any scratchpad script that logs in). Wait for /health/ready. Rules: docs/testing/ci.md#e2e-stack-t-106 (one worker, no retries, reset before every rerun, ≤ 5 logins per minute per IP). A fresh browser context starts in English: sign in with the en labels.
- Screenshots: scratchpad Playwright script (API login, PUT /api/auth/preferences for the language, scrollWidth check), `<page>-<lang>-<width>.png` in docs/delivery/evidence/m1/ (git-ignored, never commit images). T-106..T-109 captures are already there.
- Windows: Application Control blocks rolldown and sometimes Debug .NET binaries. Web checks in Linux: `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/keemese-english:/repo" -v keemese-web-nm:/repo/web/node_modules -w /repo/web node:24-alpine sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"`. .NET tests in Release. Playwright on Windows. Subagents get their own node_modules volume.
- gitleaks flags password-like literals next to `*Password` keys, also in tests: generate the value instead.

## Before starting
1. Check the push ci run on develop after bfd8df6 (not checked at handoff).
2. Check `pending_owner_actions` in progress.json (branch protection, e2e-smoke as a required check, T19 doc, OD answers).
3. T-110 is an **L4 gate**: `security-reviewer` over the whole M1 diff (`git diff <M0 close>...develop`) plus a gitleaks full-history scan run locally. M1 closes only after the Lead Coordinator approves.

## The one next task
T-110 on `chore/m1-gate` from `develop`. Follow the packet: evidence for every M1 exit criterion in docs/delivery/milestones.md (J2 ≤ 2, forced change + lockout, isolation + authorization enumeration, E2E green in CI, AppShell 4 widths × 2 languages, the tutor-password reset CLI against the container), the standard gate (full backend + frontend tests, full E2E, axe, visual QA), `docs/delivery/evidence/m1.md`, traceability updated. Small fixes in the branch; larger ones become `fix/*` packets and block the gate. Then PR and the owner's approval.

## Verify before building on it
Web vitest 122/122 (Linux container), E2E 5/5 on a fresh stack and PR #25 CI green incl. e2e-smoke, all 2026-10-24. .NET unit 27/27, integration 37/37 (T-104/T-105). Hooks 13/13, scripts 4/4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-110 PR open with evidence and the owner asked to close M1 → stop.
