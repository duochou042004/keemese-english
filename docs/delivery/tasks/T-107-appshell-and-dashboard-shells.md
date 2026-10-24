# T-107: AppShell (tutor and student) and the Today / Home shells

- Milestone: M1 · Ladder level: L4 (AppShell, shared layout) · Depends on: T-106 merged · Branch: `feature/m1-appshell` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: in_review (2026-10-24)

## Objective
Both roles get the navigation decided in OD-09 at all four widths, with an account menu, and land on a Today / Home page that shows designed empty states instead of fake data.

## Requirements / acceptance criteria
- **OD-09 navigation (accepted 2026-10-23)**, exactly as docs/frontend/information-architecture.md:
  - Tutor: Today · Students · Calendar · Review · Activities · Question bank · Library. Student: Home · Tasks · Lessons · Materials · Progress.
  - **Items whose feature hasn't shipped are hidden, not disabled** (same rule as FR-STU-AC4). In M1 the tutor sees Today and Students; the student sees Home. The nav config lists every item with the milestone that enables it, so later packets flip one flag.
- **Layout shells** (IA #layout-shells): ≥ 1280 labelled sidebar (tutor 240 px, student 220 px); 768–1279 icon rail 64 px with tooltips; < 768 tutor top bar + menu drawer, student bottom tab bar with labels. Collapsed state may be remembered in `localStorage` (UI convenience only). Skip-to-content link, landmarks, visible focus, `aria-current` on the active item (FR-UX-03).
- **Account menu** (avatar, top right): tutor → Settings (`/t/settings`: language + change password link), Log out; student → `/s/account` (language, change password), Log out. Moves the temporary logout button from T-106 here.
- **Product name:** `APP_NAME` placeholder and a neutral wordmark (OD-02 default; cosmetic, can change later).
- **Today shell (FR-DASH-01, M1 part):** page header, an empty state for today's sessions and the review queue that says what will appear here, and the **Add student** quick action (the only one that exists in M1). No calls to endpoints that don't exist.
- **Home shell (FR-DASH-02, M1 part):** greeting with the student's display name, empty states for tasks and next session.
- Components per docs/frontend/design-system.md#components: `AppShell` (two variants), `PageHeader`, `EmptyState`; reuse tokens only (off-system colors don't compile). Add only the shadcn primitives used (e.g. Sheet for the drawer, Tooltip, DropdownMenu, Avatar).
- i18n `vi`/`en` for every label; Vietnamese labels fit the rail tooltips and bottom bar at 390 px.
- Tests: Vitest for the nav config (hidden items, role split); `E2E-AUTH` extended to assert the shell renders for both roles; axe clean on `/t`, `/t/settings`, `/s`, `/s/account`.
- **Visual QA** (docs/frontend/design-system.md checklist): `/t` and `/s` at 1440/1024/768/390 × vi/en, no horizontal scroll, screenshots in `docs/delivery/evidence/m1/` (invented data only).

## Inputs (read these, nothing more)
- docs/frontend/information-architecture.md (whole file) · docs/frontend/design-system.md · docs/decisions/README.md (OD-02, OD-09)
- docs/product/requirements.md (FR-DASH-01/02, FR-UX-01..04) · `web/src/routes/**`

## File ownership
- create/modify: `web/src/components/**` (AppShell, PageHeader, EmptyState, needed shadcn primitives), `web/src/routes/{t,s}*`, `web/src/routes/t/**`, `web/src/routes/s/**`, `web/src/locales/**`, `web/e2e/**`, `docs/delivery/evidence/m1/**`, `progress.json`
- must not touch: `src/**`, `.github/**`, `web/src/api/**`

## Out of scope
Students pages (T-108). Real dashboard data (M7). Calendar, Review, Activities, Question bank, Library pages.

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
npm run e2e --prefix web        # background, against the Compose stack
```
Evidence: counts, axe result, the screenshot set, `not_run` (Firefox/WebKit until release).
Review: `reviewer` (L4, visual check against the checklist).

## Status / notes
- In review on `feature/m1-appshell` (2026-10-24); evidence in progress.json.
- Students and Add student link to `/t/students` and `/t/students/new`, which T-108 builds (T-108 may not touch the AppShell, so the flag is on now); until then they reach the 404 page.
- No icon library: inline SVG icons (`components/icons.tsx`), since lucide-react would be a new runtime dependency. Radix Dialog / Tooltip / DropdownMenu are used directly; no Avatar (initial only).
- The tablet rail stays collapsed (no expand toggle, nothing in `localStorage`). The phone top bar shows the wordmark, not the page title. `APP_NAME` = the i18n `app.name` placeholder.
- The language switch moved from the header to `/t/settings` and `/s/account`.
