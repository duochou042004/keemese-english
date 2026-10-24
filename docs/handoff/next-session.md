# Next session: T-108, Student list and Add student (J2)

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-108-students-list-and-add-student.md. Do not rely on chat history.

## State (verified 2026-10-24, develop at 8ed413c)
- T-101..T-107 are merged into `develop`. T-107 (PR #20) added the AppShell, the account menu and the Today / Home shells. Evidence is in progress.json.
- Shell pieces: `web/src/components/nav.ts` (OD-09 config; `shipped` flags; Students is already on), `AppShell.tsx`, `AccountMenu.tsx`, `PageHeader.tsx` (one primary action; on phones it sits in a bottom bar), `EmptyState.tsx` (title, icon, text, optional action), `icons.tsx` (inline SVG; no icon library), `AccountSettings.tsx`. `SignOutButton.tsx` exports `useSignOut`.
- T-107 left two `shortcut:` string paths for T-108: the Today "Add student" link (`web/src/routes/t/index.tsx`, `addStudent`) and the nav link cast in `AppShell.tsx` `NavLink`. Once `/t/students` and `/t/students/new` exist, link them type-checked. T-108 may not touch the AppShell itself: the `NavLink` cast can stay until the last nav item ships. Until T-108 merges, both links reach the 404 page.
- E2E: `npm run e2e:reset --prefix web` starts a fresh `keemese-e2e` Compose project (stop other stacks first: ports 5432/8080); `npm run e2e --prefix web` runs Playwright. Without a repository `.env`, export throwaway BOOTSTRAP_TUTOR_USERNAME, BOOTSTRAP_TUTOR_PASSWORD, POSTGRES_PASSWORD and Security__IpHashSalt in the same shell for both commands. Rules: docs/testing/ci.md#e2e-stack-t-106 (one worker, no retries, reset before every rerun, at most 5 logins per minute from one IP). Call `expectAccessible(page)` after every page visit. The account language is `vi`, the browser's `en`: pick selectors from the locale JSON. E2E-AUTH has helpers `openFromAccountMenu` and `expectNav`.
- Screenshots: T-107 used a scratchpad Playwright script (API login on a fresh stack, language via PUT /api/auth/preferences, scrollWidth check); names `<page>-<lang>-<width>.png` in docs/delivery/evidence/m1/. Wait for /health/ready after a reset (one ECONNRESET right after `up --wait`).
- Windows: the Application Control policy blocks rolldown (vite/vitest). Run web checks in Linux: `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/keemese-english:/repo" -v keemese-web-nm:/repo/web/node_modules -w /repo/web node:24-alpine sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"`. The build regenerates `src/routeTree.gen.ts`: commit it. Don't run two containers on the shared node_modules volume at once. Playwright and Chromium run on Windows.
- gitleaks flags invented password literals in `*Password` names: avoid them.

## Before starting
1. Check `pending_owner_actions` in progress.json (e2e-smoke as a required check is still open).
2. Merges: docs/agents/operating-model.md#merge-delegation. T-108 is L3: you may merge it yourself within the delegation (green CI, reviewer done, evidence recorded, nothing critical).

## The one next task
T-108 on `feature/m1-students-ui` from `develop`. Follow the packet: `/t/students` (search, Active/Archived filter in Zod search params, loading/empty/error states, pagination), `/t/students/new` (J2 form, suggested username, generated temporary password, collapsed optional groups, taken-username suggestion, success panel with Copy message, Done / Open workspace only), Vitest + MSW, E2E-J2 with the interaction count, axe, screenshots. Then reviewer, evidence, PR, merge within the delegation.

## Verify before building on it
Web vitest 77/77 (Linux container) and E2E-AUTH 3/3 on a fresh stack, both 2026-10-24. Hooks 13/13, scripts 4/4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-108 merged and recorded → stop.
