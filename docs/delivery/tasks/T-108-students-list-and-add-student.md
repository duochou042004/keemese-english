# T-108: Student list and Add student (J2)

- Milestone: M1 · Ladder level: L3 (journey J2) · Depends on: T-104 and T-107 merged · Branch: `feature/m1-students-ui` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: not_started

## Objective
The tutor finds students by name and creates a usable student account in two interactions, with the temporary password shown once and a ready-to-paste message.

## Requirements / acceptance criteria
- **`/t/students`** (FR-STU-03): search box (`q`, debounced, diacritics-insensitive on the server), Active / Archived filter (`status`), both in Zod-validated search params; rows open the workspace (`/t/students/$studentId`, built in T-109); loading, empty ("Add your first student") and error states (FR-UX-04); pagination if `total` > page size.
- **`/t/students/new`, J2** (docs/frontend/ux-journeys.md#j2): one form; required Full name, Username (suggested from the name with diacritics stripped, e.g. "nguyen.minhanh", editable, uniqueness shown on blur or on submit), Temporary password (generated client-side, Copy and Regenerate; or left to the server). Optional groups (Contact: email, phone, contact channels; Parent/guardian: repeatable name, relationship, contact, notes) **collapsed by default** (FR-STU-AC1, FR-STU-05).
  - `students.username_taken` → inline error with a suggestion ("nguyen.minhanh2") (AC2).
  - Success panel: "Account created", username + password in a copyable block, **Copy message** (bilingual prefilled text with the login URL). The password is shown only here; leaving the panel drops it from memory.
  - Follow-ups (FR-STU-AC4): only actions that exist in M1 are shown → **Done** / **Open workspace**. Set a goal (M2), Create learning plan (M6), Schedule first session (M5) are hidden.
- **Budget:** 2 interactions from the list to a usable account (Add student → Create), counted in `E2E-J2`.
- Today's **Add student** quick action (T-107) and the Students page header action both open the form.
- i18n `vi`/`en`; Vitest + MSW for the form (validation, username suggestion, taken error, copy message text).
- **`E2E-J2`** (tagged for the students area + release): tutor adds "Trần Gia Bảo" with only the required fields in 2 interactions; the new student logs in with the copied password and is forced to change it; a duplicate username shows the suggestion. axe on both pages.
- Visual QA: list (empty and filled) and form (collapsed and expanded, success panel) at 4 widths × 2 languages → `docs/delivery/evidence/m1/`.

## Inputs (read these, nothing more)
- docs/frontend/ux-journeys.md#j2 · docs/frontend/information-architecture.md#routes · docs/frontend/design-system.md
- docs/product/requirements.md#stu--students-and-student-workspace · docs/architecture/api.md#students-students--identity · `web/src/api/schema.d.ts`

## File ownership
- create/modify: `web/src/features/students/**`, `web/src/routes/t/students*`, `web/src/locales/**`, `web/e2e/**`, `docs/delivery/evidence/m1/**`, `progress.json`
- must not touch: `src/**`, `.github/**`, `web/src/components/ui/**` and AppShell (ask if a new shared component is needed), `web/src/api/client.ts`

## Out of scope
The workspace and account actions (T-109). Contact channel types beyond free text `{type, value}` with a short suggested list (Zalo, Facebook, Other).

## Verification
```bash
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
npm run e2e --prefix web        # background
```
Evidence: counts, the interaction count from `E2E-J2`, axe, screenshots, `not_run`.
Review: `reviewer` (L3).

## Status / notes
—
