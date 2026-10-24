# T-109: Student workspace shell, profile editing and account actions

- Milestone: M1 · Ladder level: L4 (destructive and account actions, isolation in the UI) · Depends on: T-108 merged · Branch: `feature/m1-student-workspace` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: in_review (PR open; merge needs the Lead Coordinator: student isolation)

## Objective
The tutor opens a student's workspace, edits their profile and parents, and archives, restores, resets, unlocks or permanently deletes the account safely; a student cannot reach any of it.

## Requirements / acceptance criteria
- **Workspace** `/t/students/$studentId` (IA #student-workspace-tabs): header (name, username, Active/Archived badge, locked badge when locked) and the tab list. **Tabs whose feature hasn't shipped are hidden**: in M1 that leaves **Overview** and **Profile**. Overview shows empty states for what later milestones add (FR-STU-07); phone width: horizontally scrollable tab list, never wrapped.
- **Profile tab** (FR-STU-02, FR-STU-05): personal (full name), contact (email, phone, channels), parents (add, edit, remove); save with `version`; `409 concurrency.conflict` → a message offering **Reload** (FR-STU-AC6). Learning profile, goals and metrics are M2 (not shown).
- **Account section** (Profile → Account):
  - **Reset password** → confirm → the new temporary password shown **once** with Copy + Copy message (FR-AUTH-06, AC7).
  - **Unlock** shown only when locked (AUTH-AC9).
  - **Archive / Restore** with a confirmation explaining that an archived student can't log in and keeps their data (FR-AUTH-07, FR-STU-06).
  - **Delete permanently**: a dialog that requires typing the student's full name exactly; the button stays disabled until it matches; after success → the list with a toast (FR-STU-06).
- Unknown or deleted `$studentId` → the localized not-found state, not a crash.
- i18n `vi`/`en`; Vitest + MSW for the profile form (conflict path), the delete dialog (name match) and the reset panel.
- **`E2E-ISO`** (M1 form, @smoke; docs/frontend/ux-journeys.md#journey--e2e-mapping): student B opening `/t/students/<A's id>` (or any `/t/*` URL) lands in `/s`, and the API returns 403 for the same data; tutor archives A → A's open session is sent to `/login` on the next navigation; delete A → A's workspace URL shows not-found. axe on Overview, Profile and each dialog.
- Visual QA: Overview, Profile, each dialog at 4 widths × 2 languages → saved locally in `docs/delivery/evidence/m1/` (git-ignored, not committed; record them in the evidence).

## Inputs (read these, nothing more)
- docs/frontend/information-architecture.md#student-workspace-tabs · docs/frontend/design-system.md
- docs/product/requirements.md (FR-STU-02, -05..07, FR-AUTH-06, -07, AC7–AC9) · docs/architecture/domain-model.md#student-account
- docs/architecture/api.md#students-students--identity · `web/src/features/students/**` (T-108)

## File ownership
- create/modify: `web/src/features/students/**`, `web/src/routes/t/students/**`, `web/src/locales/**`, `web/e2e/**`, `docs/delivery/evidence/m1/**`, `progress.json`; shadcn Dialog / AlertDialog / Tabs / Badge in `web/src/components/ui/**` if not present
- must not touch: `src/**`, `.github/**`, AppShell, `web/src/api/client.ts`

## Out of scope
Plan, Sessions, Work, Materials and Notes tabs (later milestones). Learning profile (M2). File deletion on delete (M3).

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
npm run e2e --prefix web        # background, full M1 suite: E2E-AUTH, E2E-J2, E2E-ISO
```
Evidence: counts, E2E results per scenario, axe, screenshots, `not_run`.
Review: `reviewer` (L4) + `security-reviewer` (account actions, isolation in the UI). Merge needs the Lead Coordinator (student isolation).

## Status / notes
—
