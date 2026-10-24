# Next session: T-109, Student workspace, profile editing and account actions

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
The SessionStart briefing shows live state. Read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-109-student-workspace-and-account-actions.md. Do not rely on chat history.

## State (verified 2026-10-24)
- T-101..T-108 are merged into `develop`. T-108 (PR #23, b0ef86d) added `/t/students` (search, Active/Archived filter, Load more) and `/t/students/new` (J2 form, success panel). Evidence is in progress.json.
- Student UI: `web/src/features/students/` (`StudentList.tsx`, `AddStudent.tsx`, `credentials.ts`, `students.test.tsx`). `StudentLink` in StudentList.tsx and the success panel's Open workspace use a `shortcut:` string path to `/t/students/$studentId`: T-109 adds that route; then make the link type-checked with `params`. The AppShell `NavLink` cast stays until the last nav item ships.
- Patterns: forms use React Hook Form + Zod, API codes land on fields via `ApiError.errors`; `useErrorText` maps codes to errors.json; list states (delayed skeleton, ErrorState with Retry + traceId) live in StudentList.tsx: reuse them within the packet's ownership.
- E2E: `npm run e2e:reset --prefix web` (fresh `keemese-e2e` stack; stop other stacks first: ports 5432/8080), then `npm run e2e --prefix web`. Without a repository `.env`, export throwaway BOOTSTRAP_TUTOR_USERNAME, BOOTSTRAP_TUTOR_PASSWORD, POSTGRES_PASSWORD and Security__IpHashSalt in the same shell for both. Wait for /health/ready after a reset. Rules: docs/testing/ci.md#e2e-stack-t-106 (one worker, no retries, reset before every rerun, at most 5 logins per minute per IP). Shared helpers: `e2e/fixtures/ui.ts` (signIn, changePassword, openFromAccountMenu, expectNav), `fixtures/seed.ts` (`tutor.password` = the post-E2E-AUTH password, `ensureTutor(lang, headers)`, `createStudent(name)`). A new spec file signs in from its own `X-Forwarded-For` address (see students.spec.ts). CI greps `@smoke` only: tag new scenarios `@smoke` plus their area tag. Call `expectAccessible(page)` after every page visit.
- Screenshots: a scratchpad Playwright script (API login, language via PUT /api/auth/preferences, scrollWidth check); save `<page>-<lang>-<width>.png` in docs/delivery/evidence/m1/ (git-ignored, never commit images).
- Windows: Application Control blocks rolldown. Run web checks in Linux: `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/keemese-english:/repo" -v keemese-web-nm:/repo/web/node_modules -w /repo/web node:24-alpine sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"`. The build regenerates `src/routeTree.gen.ts`: commit it. Give subagents their own node_modules volume. Playwright runs on Windows.
- gitleaks flags password-like literals next to `*Password` keys, also in tests: generate the value instead.

## Before starting
1. Check `pending_owner_actions` in progress.json (e2e-smoke as a required check is still open).
2. T-109 is **L4** (destructive actions, isolation in the UI): reviewer **and** security-reviewer. Merge delegation (docs/agents/operating-model.md#merge-delegation) excludes changes to authorization or student isolation: ask the owner before merging if the change touches them.

## The one next task
T-109 on `feature/m1-student-workspace` from `develop`. Follow the packet: workspace route (Overview, Profile tabs only), profile editing with `version` and the 409 Reload offer, parents, account actions (archive with Undo, restore, reset password, unlock, delete with typed name), tests, E2E, axe, screenshots. Then reviewers, evidence, PR.

## Verify before building on it
Web vitest 106/106 (Linux container), E2E 4/4 on a fresh stack and PR #23 CI green incl. e2e-smoke, all 2026-10-24. Hooks 13/13, scripts 4/4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-109 merged and recorded → stop.
