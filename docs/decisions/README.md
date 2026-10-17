# Decision Log

Three kinds of decisions live here:

- **ADR-nnnn** (architecture decision record): one file each, technical, changes only through a superseding ADR.
- **PD-nn** (product decision): scope calls the product owner made or accepted. Recorded here.
- **OD-nn** (open decision): **not yet decided**. Each has a recommended default and the milestone where it blocks.

Rule: never switch a decided technology or scope without a new ADR or PD that cites the evidence. Agents may *propose* one but may not *accept* it; only the product owner (Lead Coordinator) accepts.

## ADRs

| ADR | Title | Status |
|---|---|---|
| [0001](0001-repository-and-branching.md) | Repository layout, public GitHub, master/develop/feature branching | Accepted 2026-10-17 |
| [0002](0002-modular-monolith.md) | Modular monolith in one ASP.NET Core project | Accepted |
| [0003](0003-postgresql.md) | PostgreSQL 18 as the database | Accepted |
| [0004](0004-cookie-auth-same-origin.md) | Same-origin cookie auth with ASP.NET Core Identity | Accepted |
| [0005](0005-vite-spa.md) | Vite + React SPA served by the API (not Next.js) | Accepted |
| [0006](0006-tanstack-router.md) | TanStack Router for routing | Accepted |
| [0007](0007-file-storage.md) | Files on a local volume behind `IFileStorage`, served only through authorized endpoints | Accepted |
| [0008](0008-i18n.md) | Bilingual UI with i18next/react-i18next; the API returns error codes | Accepted |
| [0009](0009-snapshot-on-assign.md) | Snapshot activity content when it is assigned | Accepted |
| [0010](0010-single-activity-engine.md) | One activity engine for assignments and assessments | Accepted |
| [0011](0011-session-status-as-attendance.md) | Attendance is part of session status | Accepted |
| [0012](0012-toolchain-pins.md) | Toolchain: .NET SDK 10.0.4xx, Node 24 LTS, npm, TypeScript 6.0 | Accepted |
| [0013](0013-testing-stack.md) | Testing stack and no pixel-diff baselines in MVP | Accepted |
| [0014](0014-frontend-foundation.md) | Tailwind v4, shadcn/ui (Radix), TanStack Query, React Hook Form + Zod | Accepted |
| [0015](0015-progress-computed-on-read.md) | Progress is computed on read; no progress table | Accepted |
| [0016](0016-minimal-apis-and-contracts.md) | Minimal APIs, ProblemDetails with error codes, OpenAPI → TypeScript types | Accepted |

Template for a new ADR: copy the shape of [0002](0002-modular-monolith.md) (Context · Decision · Alternatives · Consequences · Revisit when).

## Product decisions

| PD | Decision | Spec | Source |
|---|---|---|---|
| PD-01 | No learning plan templates in MVP. Plans are built by hand. Templates and "course as template" are Phase 2. UX focus is tutor convenience | §11, §31, §43 | **Approved** by the product owner, 2026-10-17 (C1) |
| PD-02 | No notification module in MVP. Dashboards show due, pending and upcoming items | §39, §42, §43 | Proposed in Phase 0, not objected to |
| PD-03 | Vocabulary tools deferred to Phase 2 | §21, §42, §43 | Proposed in Phase 0, not objected to |
| PD-04 | MVP question types: single choice, multiple choice, true/false, fill in the blank, short answer, long answer, file upload. Matching, ordering and in-browser audio recording are Phase 2. Students may upload audio **files** | §17, §43 | **Approved** 2026-10-17 (C4) |
| PD-05 | No general content versioning. Assigned work is snapshotted (ADR-0009) | §32, §43 | Proposed, not objected to |
| PD-06 | Feedback = rubric criteria scores + text comments (timestamps typed as text). No annotation UI in MVP | §20 | Proposed, not objected to |
| PD-07 | No self-service forgot-password in MVP. The tutor resets the password and the student must change it at next login | §4.3 | **Approved** 2026-10-17 (C7) |
| PD-08 | Navigation follows tasks: Learning plans and Progress live **inside** the student workspace rather than as top-level menus; Assignments and Assessments share one "Activities" area with a kind filter; a top-level "Review" queue is added | §41 ("can be adjusted") | Proposed in Phase 1, **needs review** with the IA doc |
| PD-09 | Bilingual UI: Vietnamese (default) and English | — | **Approved** 2026-10-17 |
| PD-10 | Public GitHub repository | — | **Approved** 2026-10-17 |
| PD-11 | Deployment target undecided. Keep it portable (single container image + PostgreSQL + volume) | — | **Approved** 2026-10-17 |
| PD-12 | One optional learning plan per student in MVP | §10 | Proposed |
| PD-13 | Score policy: a student activity's score = its best graded attempt | §15 | Proposed |

"Proposed, not objected to": raised in the Phase 0 report. The product owner explicitly approved only C1, C4 and C7, then authorized Phase 1 without objecting to the others. Treat these as accepted but cheap to revisit before the milestone that implements them.

## Open decisions

| OD | Question | Recommended default | Blocks |
|---|---|---|---|
| OD-01 | Recurring lessons are Phase 2 (§43), but creating every weekly session by hand costs clicks. Add a small "Duplicate to next week" action in MVP? | Yes, as a single action, no recurrence rules | M5 |
| OD-02 | Product display name and logo (repository: `keemese-english`) | Placeholder name from config `APP_NAME`; neutral wordmark | M1 (cosmetic) |
| OD-03 | Upload limits | Documents and images 25 MB, audio 50 MB, video 200 MB, total per student unlimited. Values come from config | M3 |
| OD-04 | A student-visible lesson summary ("what we covered") next to the private note | Yes (FR-LES-05) | M5 |
| OD-05 | Rich text editor: Tiptap (ProseMirror JSON) vs Markdown textarea with preview | Decide via a 1-day spike at the start of M3; lean Tiptap for tutor usability | M3 |
| OD-06 | Hosting target (TLS proxy, backups, volume type) | Defer until before release 1.0 (PD-11) | R1.0 |
