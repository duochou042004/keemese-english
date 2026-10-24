# Next session: T-107, AppShell (tutor and student) and the Today / Home shells

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Your session briefing (SessionStart hook) shows the live repository state. Then read AGENTS.md, progress.json and the packet docs/delivery/tasks/T-107-appshell-and-dashboard-shells.md. Do not rely on chat history.

## State (verified 2026-10-24, develop at d047d5a)
- T-101..T-106 are merged into `develop`. T-106 (PR #18) added the login flow and the E2E harness. Evidence is in progress.json.
- Web auth pieces: `web/src/lib/guard.ts` (`meQuery` = `['me']`, `requireRole`, `requireSignedIn`, `redirectHome`; the `me` fetch applies the account language), `web/src/components/{AuthLayout,FormField,SignOutButton,LanguageSwitcher}.tsx` (the switcher saves the language via `PUT /api/auth/preferences` when signed in), `web/src/lib/errors.ts` (`useErrorText`), `web/src/features/auth/*`. `web/src/components/TemporaryShell.tsx` is the stopgap `/t` and `/s` header. T-107 replaces it with the AppShell and moves Sign out into the account menu.
- E2E: `npm run e2e:reset --prefix web` starts a fresh `keemese-e2e` Compose project (stop other stacks first: ports 5432/8080). `npm run e2e --prefix web` runs Playwright. Both read the repository `.env` (BOOTSTRAP_TUTOR_*, POSTGRES_PASSWORD, Security__IpHashSalt). Without a `.env`, export those values in the shell. Rules are in docs/testing/ci.md#e2e-stack-t-106: one worker, no retries, reset before every rerun, at most 5 logins per minute from one IP. Call `expectAccessible(page)` (`web/e2e/fixtures/axe.ts`) after every page visit. Tests generate new passwords at run time. The account language is `vi`, the browser's is `en`: pick selectors from the locale JSON.
- CI `e2e-smoke` runs Chromium `@smoke` whenever backend or web changes.
- Windows: the local Application Control policy blocks rolldown (vite/vitest) and openssl. Run web checks in Linux: `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/keemese-english:/repo" -v keemese-web-nm:/repo/web/node_modules -w /repo/web node:24-alpine sh -c "npm ci && npm run lint && npm run typecheck && npm test && npm run build"`. The container build also regenerates `src/routeTree.gen.ts`: commit it. Playwright and Chromium do run on Windows.
- gitleaks flags invented password literals assigned to `*Password` names: avoid them.

## Before starting
1. Check `pending_owner_actions` in progress.json (new: add `e2e-smoke` to the required checks).
2. Merges: docs/agents/operating-model.md#merge-delegation only. T-107 is a shared layout (L4): ask before merging.

## The one next task
T-107 on `feature/m1-appshell` from `develop`. Follow the packet: OD-09 navigation (unshipped items hidden), the layout shells at 4 widths, the account menu (Settings or Account, Log out), the Today and Home shells with empty states, `PageHeader`/`EmptyState`, Vitest for the nav config, E2E-AUTH extended to cover the shells, axe on /t, /t/settings, /s, /s/account, and screenshots in docs/delivery/evidence/m1/. Then reviewer + security-reviewer, evidence, PR, and ask the Lead Coordinator to merge.

## Verify before building on it
Web vitest 68/68 (Linux container) and E2E-AUTH 3/3 on a fresh stack, both 2026-10-24. Hooks 13/13, scripts 4/4.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. T-107 in review with evidence recorded → ask for merge approval. Stop.
