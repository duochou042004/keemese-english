# Product Scope

> Source of truth: [`personal_english_tutor_teaching_workspace_spec.md`](../spec/personal_english_tutor_teaching_workspace_spec.md) (the "spec", referenced as `§n`).
> This file restates scope in engineering terms. If it ever disagrees with the spec, the spec wins and this file is a bug.
> Background only (not normative): [`conversation_with_AI.md`](../spec/conversation_with_AI.md).

## One sentence

A private teaching workspace for **one tutor** and the **students that tutor creates**, where the tutor builds, personalizes and tracks each student's learning without a fixed curriculum or workflow (§57).

## Users

| Role | Count | How the account exists | Can do |
|---|---|---|---|
| `TUTOR` | exactly 1 | Bootstrapped at install time (see [security model](../security/security-model.md#tutor-bootstrap)) | Everything (§3.1) |
| `STUDENT` | ~1–100 (spec example: 24) | Created by the tutor; no self sign-up (§4) | Read their own workspace, do their own work, change their password (§3.2, §26) |

No other roles, no parents with accounts, no staff (§3.1, §5.6).

## Core product model

The **Student Workspace** is the centre (§6, §7). Reusable source content lives in libraries; each student's work lives in student-owned activity records (§15, §32).

```text
Tutor
├── Libraries (reusable, student-independent)
│   ├── Content library: folders, files, rich text, links, embeds
│   ├── Lessons: reusable lesson plans
│   ├── Question bank
│   └── Activities: assignments and assessments built from questions
└── Students
    └── Student workspace (one per student, sections may be empty)
        ├── Profile and learning profile
        ├── Goals and metrics
        ├── Learning plan (optional)
        ├── Sessions (schedule, attendance, summaries)
        ├── Work: student activities, attempts, answers, feedback
        ├── Materials granted to this student
        ├── Progress (derived)
        └── Private teacher notes (never visible to the student)
```

## Guiding principles (binding)

1. **Generic engine, user-defined content** (§33). No `TOEIC`, `IELTS`, `THPT` or similar types, enums, tables or seed content anywhere in code. Tags, folders, metric names, section names and so on are tutor data.
2. **Content ≠ student activity** (§15, §32). Student actions never change source content. Assigned work is snapshotted, so later edits to the source do not change it ([ADR-0009](../decisions/0009-snapshot-on-assign.md)).
3. **Nothing is mandatory except the minimum** (§40.3, §49). A student can exist with only a name, username and temporary password.
4. **Tutor-first, few clicks** (§28, §40, §48). The after-lesson flow is the most important UX in the product.
5. **Priority order** (§54): simplicity > flexibility > correctness > security > maintainability > UX > performance > scalability. Security and correctness are never traded for simplicity: they are listed in that order to rank features, not to rank defects.

## MVP scope (§42, as amended by product decisions)

Authentication · Student management · Student workspace · Goals and metrics · Content library and materials · Question bank · Lessons, sessions, calendar and attendance · Teacher notes · Learning plan · Activity engine (assignments and assessments, submission, auto and manual grading, feedback) · Progress · Tutor dashboard · Student dashboard · **Bilingual UI (Vietnamese and English)** (user decision, 2026-10-17).

Detailed requirements: [requirements.md](requirements.md). Mapping to the spec: [traceability.md](traceability.md).

## Explicit non-goals (§5, §45, §53, §58)

Never build these unless the product owner opens a new requirement:

- Public registration, sign-up, enrolment, trial booking, lead management, student self-booking (§4.1, §5.1, §22)
- Payments, invoices, subscriptions, tuition status, accounting (§5.2)
- Multiple tutors, staff roles, organisations, branches, marketplace, tutor listing, multi-tenant SaaS (§3.1, §5.3)
- Any AI feature (§5.4)
- Chat, messaging, voice or video calls, whiteboard, conferencing. Meeting **links** are stored only (§5.5)
- Parent portal or parent accounts. Parent **contact details** are stored only (§5.6)
- Built-in English content, curricula, exam-specific engines (§13, §18, §53)
- A Google-Drive-style file manager (§38)
- A customer-facing plugin or extension marketplace. "Plugins" in this repo means **AI developer tooling only** ([docs/agents/plugins.md](../agents/plugins.md)).

## Deferred: Phase 2 and Future (not in MVP)

| Item | Spec | Why it is deferred |
|---|---|---|
| Learning plan templates, "course as template" | §11, §31, §43 | PD-01: MVP plans are built by hand; templates first in Phase 2 |
| Notification system (in-app, email, push) | §39, §43 | PD-02: dashboards show what is due instead |
| Vocabulary tools | §21, §43 | PD-03 |
| Matching, ordering and in-browser audio recording question types | §17, §43 | PD-04: students can upload audio **files** in MVP |
| Full content versioning | §32, §43 | PD-05: a snapshot on assign covers the MVP need |
| Timestamped or annotated feedback UI | §20 | PD-06: rubric scores and text in MVP |
| Self-service "forgot password" (email) | §4.3 | PD-07: the tutor resets passwords in MVP |
| Recurring lessons, advanced calendar | §43 | Phase 2 (see open decision OD-01) |
| Advanced analytics and reporting | §43, §44 | Phase 2 and 3 |
| Multiple learning plans per student | — | Not requested; one optional plan per student in MVP |
| Dark mode | — | Not requested; the tokens allow it later |
| AI, payment, parent portal, public landing page, external integrations | §44 | Phase 3 / Future, behind product decisions |

The decision IDs (`PD-xx`, `OD-xx`) are defined in [docs/decisions/README.md](../decisions/README.md).

## Assumptions (to revisit if they prove false)

| # | Assumption | Consequence if false |
|---|---|---|
| A1 | ≤ 100 active students and ≤ 10 GB of files over the product's life | Storage adapter or pagination work (see the risk register) |
| A2 | The tutor and students are mostly in Vietnam. Times are stored in UTC and displayed in the viewer's time zone | Time zone settings per user |
| A3 | Students may use phones as their main device; the tutor mostly uses a laptop | The responsive priorities change |
| A4 | Usernames, not emails, are the login identifier (students may have no email) | — |
| A5 | Each student has at most one active learning plan | Phase 2: multiple plans |
| A6 | Tutor-entered content is not translated. Only UI chrome is bilingual | — |
| A7 | The repository is public: no real student data, secrets or personal data in Git, fixtures or screenshots | — |
| A8 | One deployment = one tutor. A second tutor would mean a second deployment, never multi-tenancy | — |
