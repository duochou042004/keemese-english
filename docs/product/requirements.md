# Functional Requirements, User Stories and Acceptance Criteria

ID format: `FR-<AREA>-<nn>`. **Every feature in code must trace to an ID here or to a product decision** ([decisions](../decisions/README.md)). Anything else is `OPTIONAL / FUTURE / REQUIRES PRODUCT DECISION` and stays out of core.

Columns: **M** = milestone ([milestones](../delivery/milestones.md)). **Spec** = section of the source spec.

Acceptance criteria (AC) are written so they can become tests. ACs are numbered **per area**, and tests and docs cite them as `FR-<AREA>-AC<n>` (for example `FR-AUTH-AC5`, `FR-LES-AC1`).

---

## AUTH — Authentication and accounts

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-AUTH-01 | Username + password login and logout for tutor and students | §4.3 | M1 |
| FR-AUTH-02 | No public registration endpoint or UI exists | §4.1, §5.1 | M1 |
| FR-AUTH-03 | Exactly one tutor account, created by an install-time bootstrap | §3.1 | M1 |
| FR-AUTH-04 | A student created with a temporary password must set a new password at first login | §4.2 | M1 |
| FR-AUTH-05 | Any user can change their own password | §4.3 | M1 |
| FR-AUTH-06 | The tutor can reset a student's password (this replaces self-service forgot-password, PD-07) | §4.3 | M1 |
| FR-AUTH-07 | The tutor can deactivate and reactivate a student account. A deactivated student cannot log in; their data is kept | §3.2 | M1 |
| FR-AUTH-08 | Each user's UI language preference (`vi`/`en`) is saved | user decision | M1 |

**Stories:** "As a tutor, I want to create a student account, so that the student can log in." "As a student, I want to log in, so that I can access my learning workspace." (§46, §47)

**AC**
- AC1: Valid credentials → session cookie set (HttpOnly, Secure in non-dev, SameSite=Lax) and redirect to the role's home. Invalid → the same generic error for an unknown user and for a wrong password.
- AC2: 5 failed attempts → account locked for 15 minutes. Lockout is logged as an audit event.
- AC3: `POST /api/auth/register` or any sign-up route → 404. No "Sign up" link in the UI.
- AC4: Bootstrap creates the tutor only when no tutor exists. A second bootstrap attempt is a no-op with a log message. A database constraint makes a second tutor impossible.
- AC5: A student with `mustChangePassword` can call only `change-password`, `me` and `logout` until they change it (API enforced, not just UI).
- AC6: A password change or reset invalidates that user's other sessions (security stamp).
- AC7: A reset shows the new temporary password **once** to the tutor. It is never stored in plain text or logged.
- AC8: A deactivated student gets the generic login error, and any existing session stops working on its next request (the security stamp is validated on every request, ADR-0004).
- AC9: The tutor can unlock a locked-out student, and the operator reset CLI also clears the tutor's lockout (threat T19).

## STU — Students and student workspace

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-STU-01 | Create a student with only the minimum: full name, username, temporary password. Email, phone, contact channels (Zalo, Facebook, …), parent/guardian contacts and notes are optional | §4.2, §49 | M1 |
| FR-STU-02 | Edit the student profile | §46 | M1 |
| FR-STU-03 | Student list: search by name (Vietnamese diacritics-insensitive), filter active/archived, open the workspace | §27, §41 | M1 |
| FR-STU-04 | Learning profile: free-text level, strengths and weaknesses (lists), learning notes, and tutor-defined custom fields (label + value) | §8 | M2 |
| FR-STU-05 | Parent/guardian contact records (name, relationship, contact, notes). No accounts | §5.6 | M1 |
| FR-STU-06 | Archive (hide and deactivate) or permanently delete a student. Delete requires typing the student's name and removes all of their records and uploaded files | §38, privacy | M1 |
| FR-STU-07 | The student workspace shows the student's sections. Empty sections show a helpful empty state, never an error | §6, §7 | M1→M7 |

**AC**
- AC1: Creating a student with just the 3 required fields succeeds in ≤ 1 form. Optional groups are collapsed by default (§40.5).
- AC2: Usernames are unique and case-insensitive. A duplicate returns field error `students.username_taken`.
- AC3: Searching "nguyen" matches "Nguyễn".
- AC4: The create flow then offers (does not force) the follow-up actions **that exist at that milestone**: "Schedule first session" (M5), "Set a goal" (M2), "Create learning plan" (M6) (§49). Before a feature ships, its action is hidden, not disabled. E2E-J2 asserts only the actions available at the gate being run.
- AC6: Editing any profile field saves with optimistic concurrency. A stale edit gets `409 concurrency.conflict` and the UI offers to reload (FR-STU-02).
- AC5: Permanent delete removes the student's rows and files. Afterwards the files return 404.

## GOAL — Goals and metrics

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-GOAL-01 | Multiple goals per student: title, description, status (active, achieved, paused, dropped), optional target date | §9 | M2 |
| FR-GOAL-02 | Tutor-defined metrics per student (name, unit, optional scale min/max), for example "Speaking fluency 0–10", "Mock test score", "Words known" | §9, §25 | M2 |
| FR-GOAL-03 | A goal can target a metric with a baseline and target value. The current value = the latest reading | §9 | M2 |
| FR-GOAL-04 | Metric readings: added manually, or recorded from a graded student activity (FR-ACT-12) | §25 | M2, M4 |
| FR-GOAL-05 | The student sees their own goals, metric history and progress toward the target | §26 | M7 |

**AC**
- AC1: No metric or goal names are predefined in code or migrations.
- AC2: Goal progress % = (current − baseline) / (target − baseline), clamped to 0–100. A qualitative goal (no metric) shows status only.
- AC3: When the metric is lower-is-better (target < baseline), the formula still yields a correct %.

## PLAN — Learning plan

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-PLAN-01 | Create, edit or delete one optional learning plan per student | §10 | M6 |
| FR-PLAN-02 | Ordered phases. Each phase holds ordered items of kind *milestone*, *activity* or *note*. Items can be added, edited, deleted, reordered and moved between phases | §10 | M6 |
| FR-PLAN-03 | Status per phase (planned, active, paused, done) and per item (todo, in progress, done, skipped, paused). Item priority (low, normal, high) | §10 | M6 |
| FR-PLAN-04 | Items may link to a goal, content item, lesson or activity. Linking content grants it to the student | §10 | M6 |
| FR-PLAN-05 | The student sees their plan read-only: phase status ✓ ▶ ○ and current focus | §26, §47 | M6 |
| FR-PLAN-06 | Plan templates — **Future** (PD-01) | §11 | — |

**Story:** "As a tutor, I want to create a learning plan, so that I can personalize the student's path." (§46)

**AC**
- AC1: Reordering works by keyboard as well as by pointer (WCAG 2.1.1).
- AC2: A student cannot change the plan (API 403/404; no edit controls).
- AC3: Two students' plans are fully independent. Editing one never affects the other.

## CONT — Content library and materials

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-CONT-01 | Folder tree: create, rename, move, delete. Deleting a non-empty folder asks whether to move its contents up or cancel | §12 | M3 |
| FR-CONT-02 | Content items of kind *file*, *rich text*, *link* or *embed*: title, description, tags, folder, created and updated dates, optional metadata | §13 | M3 |
| FR-CONT-03 | File upload for PDF, DOCX, PPTX, images, audio, video and other allowed types, with server-enforced size and type limits | §13, §38 | M3 |
| FR-CONT-04 | View or download. Inline preview for PDF, image, audio and video where the browser supports it; download for the rest | §38 | M3 |
| FR-CONT-05 | Search (diacritics-insensitive) and filter by folder, kind and tag | §12 | M3 |
| FR-CONT-06 | Grant content to a student directly. Attaching content to a session, activity or plan item grants it automatically | §26, §38 | M3 |
| FR-CONT-07 | A student sees and downloads only content granted to them | §37 | M3 |
| FR-CONT-08 | Archive (hide but keep, for history) or delete unreferenced items | §12 | M3 |

**Story:** "As a tutor, I want to create and organize learning content, so that I can reuse it later." (§46) · "As a student, I want to access my assigned materials, so that I can study." (§47)

**AC**
- AC1: An upload over the limit or of a disallowed type → 413 or 415 with an error code. Nothing is stored.
- AC2: Student B requesting a file granted only to A → 404.
- AC3: Removing the attachment that caused a grant removes that grant. Other grants for the same item remain.
- AC4: Rich text is sanitized on the server. Stored or rendered `<script>` and event handlers never execute (see the [threat model](../security/threat-model.md)).

## LES — Lessons, sessions, schedule and attendance

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-LES-01 | Reusable lesson plans: title, duration, body (rich text), materials, suggested homework activities. No field is required except the title | §14 | M5 |
| FR-LES-02 | Schedule a session: student, date and time, duration, online/offline, meeting URL or location, preparation notes (private), optional lesson plan | §22 | M5 |
| FR-LES-03 | Calendar: tutor week view and agenda view across all students. Students see only their own sessions | §22 | M5 |
| FR-LES-04 | Session status: scheduled, completed, absent, cancelled. Changing the time of a scheduled session keeps the original time so the UI shows "rescheduled from …" | §23 | M5 |
| FR-LES-05 | **After-lesson wrap-up on one screen:** set status, write a student-visible summary ("what we covered"), write a private note, attach materials, assign homework (existing activity or a quick task), save once | §28, §48 | M5 |
| FR-LES-06 | Lesson history per student (newest first), with summary, materials and homework | §46 | M5 |
| FR-LES-07 | One-click "Join meeting" for online sessions | §5.5 | M5 |

**Story:** "As a tutor, I want to record what happened in a lesson, so that I have a learning history." · "As a student, I want to see upcoming lessons, so that I know when my next class is." (§46, §47)

**AC**
- AC1 (critical journey J1): From the tutor dashboard, wrapping up today's session with a summary, a private note, one existing material and one existing homework activity takes **≤ 7 interactions** and **one save**, with no page navigation besides opening the session ([UX journeys](../frontend/ux-journeys.md#j1)).
- AC2: The wrap-up is one transaction. On failure nothing is half-saved and the form keeps its input.
- AC3: The student never sees preparation notes or private notes. They do see the summary.
- AC4: Session times display in the viewer's time zone with an unambiguous date format for the current language.
- AC5 (FR-LES-03): A student's Lessons page lists only their own upcoming sessions, soonest first, with time, mode and a Join button for online sessions. Another student's session ID → 404.
- AC6: The student-visible summary in FR-LES-05 is subject to **OD-04**. If OD-04 is rejected, the wrap-up keeps only the private note.

## NOTE — Private teacher notes

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-NOTE-01 | Private notes belong to a student and may also link to a session, an activity or a student activity | §24 | M2 |
| FR-NOTE-02 | Notes are never returned by any student-facing endpoint or shown in student UI | §24, §37 | M2 |
| FR-NOTE-03 | Notes appear chronologically in the student workspace and can be pinned | §24 | M2 |

**AC**
- AC1: An automated test calls every `/api/me/**` endpoint as a student with notes on record and asserts that no note text appears in any response body (see [testing strategy](../testing/strategy.md#isolation-suite)).

## QB — Question bank

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-QB-01 | Create, edit, duplicate, archive and delete questions (delete only if no activity uses them) | §16 | M4 |
| FR-QB-02 | Fields: prompt (rich text), type, options, correct answer, explanation, difficulty (optional: easy, medium, hard), tags, default points, attachments (image or audio files) | §16 | M4 |
| FR-QB-03 | MVP types: single choice, multiple choice, true/false, fill in the blank, short answer, long answer, file upload (PD-04) | §17 | M4 |
| FR-QB-04 | Search (diacritics-insensitive) and filter by type, tag, difficulty and archived | §16 | M4 |
| FR-QB-05 | Tags are tutor data with autocomplete from existing tags. No tag is predefined | §16 | M4 |

**AC**
- AC1: Editing a question never changes any already-assigned student activity (FR-ACT-13).
- AC2: Each type validates its own answer key (for example, single choice needs exactly one correct option).

## ACT — Activity engine (assignments and assessments)

Assignments (homework) and assessments (quizzes, tests, mock exams) share **one engine** ([ADR-0010](../decisions/0010-single-activity-engine.md)). The kind changes the defaults and labels, never the code path.

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-ACT-01 | Create an activity: kind (assignment or assessment), title, description, instructions, attachments, items (picked from the bank or created inline, which saves them to the bank), points per item, pass mark %, time limit, max attempts, release policy | §17, §18 | M4 |
| FR-ACT-02 | Named, ordered sections with instructions. An assignment has one implicit section by default | §18, §50 | M4 |
| FR-ACT-03 | Assign to one or more students with an optional available-from date and due date. Each assignment creates an independent student activity with a snapshot of the content | §15, §32 | M4 |
| FR-ACT-04 | The student sees their tasks (to do, overdue, submitted, graded), starts an attempt, answers with autosave, and submits | §29 | M4 |
| FR-ACT-05 | The time limit is enforced by the server. An attempt past its deadline is auto-submitted when it is next touched | §17, §18 | M4 |
| FR-ACT-06 | Max attempts are enforced. The student activity's score = its best graded attempt | §15 | M4 |
| FR-ACT-07 | Auto-grading for single choice, multiple choice (all-or-nothing), true/false, fill in the blank (per blank, normalized match) and short answer (when accepted answers are set). Long answer and file upload always need manual review | §19 | M4 |
| FR-ACT-08 | Manual grading: score and comment per answer, an overall comment, and rubric criteria scores (tutor-named, for example "Pronunciation 6/10"). The tutor can override auto scores | §19, §20 | M4 |
| FR-ACT-09 | Release: "immediately" (fully auto-graded only) or "after review". After release the student sees score, feedback and, if enabled, correct answers and explanations | §19, §26 | M4 |
| FR-ACT-10 | Per student: extend the due date, cancel an assignment, allow an extra attempt | §15 | M4 |
| FR-ACT-11 | Students upload files (document, image or audio file) as answers, within limits | §19 | M4 |
| FR-ACT-12 | When assigning, the tutor may choose a metric to receive the result (for example "Mock test score"). On release, a reading is recorded | §25 | M4 |
| FR-ACT-13 | Editing or archiving the source activity or its questions never changes existing student activities | §15, §32 | M4 |
| FR-ACT-14 | Review queue: all submitted, unreviewed attempts across students, oldest first | §27 | M4 |

**Stories:** "build assignments from my question bank", "create custom assessments", "grade and comment on student submissions", "complete assignments", "see my scores and feedback" (§46, §47).

**AC**
- AC1: The answer key and explanations never reach the student before release (asserted in API tests on every `/api/me` task and attempt response).
- AC2: An answer saved after the attempt's server deadline (+30 s grace) is rejected with `attempts.time_expired`.
- AC3: The same activity assigned to A and B → A's attempts, answers, scores and feedback are invisible to B and are not affected by B.
- AC4: Critical journey J3 (create assessment → assign) follows the spec's §50 order, and each step can be skipped or edited later.
- AC5: Grading is deterministic. Unit tests cover every type, including partial fill-in-the-blank and normalization (case, surrounding whitespace, Unicode NFC).

## PROG — Progress

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-PROG-01 | Tutor progress view per student: activities completed/assigned, average %, assessment score series, goals achieved/total, attendance (completed vs absent), plan item completion, metric charts | §25 | M7 |
| FR-PROG-02 | The student sees the same view of their own data (minus private data) | §26, §51 | M7 |
| FR-PROG-03 | All figures are derived from records. There is no hand-maintained progress field | §25 | M7 |

**AC**
- AC1: Every figure has a unit test computing it from fixture records, including the zero-data case (shows "—", not 0% or NaN).

## DASH — Dashboards

| ID | Requirement | Spec | M |
|---|---|---|---|
| FR-DASH-01 | Tutor "Today": today's sessions in time order with Join and Wrap-up actions, review queue count and top items, "needs attention" (overdue work, absences, inactive students), **recent student activity** (latest submissions, starts and completions, max 10), upcoming sessions, quick actions (add student, schedule, create activity) | §27, §55 | M1 shell, M7 |
| FR-DASH-02 | Student "Home": greeting, primary goal progress, tasks due (soonest first), next session with Join, latest released result | §26 | M1 shell, M7 |

**AC**
- AC1: The tutor dashboard answers the §55 questions (who today, what is pending, latest results) without scrolling at 1440×900 for a typical day (≤ 5 sessions).
- AC2: No decorative charts. Each widget offers an action or links to one (§27).

## UX — Cross-cutting UX requirements

| ID | Requirement | Source | M |
|---|---|---|---|
| FR-UX-01 | Bilingual UI (Vietnamese, English), switchable at any time. Default Vietnamese | user decision | M1 |
| FR-UX-02 | Works on desktop, tablet and phone widths (1440, 1024, 768, 390 px) with no horizontal page scroll | §40, baseline | all |
| FR-UX-03 | WCAG 2.2 AA target: keyboard operable, visible focus, labelled controls, contrast | baseline | all |
| FR-UX-04 | Every data view has designed loading, empty and error states | baseline | all |
| FR-UX-05 | Destructive actions confirm. Archive offers undo | §40 | all |

---

## Non-functional requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-SEC-01 | **Student isolation:** a student can read or write only their own records and their granted content | Isolation suite on every `/api/me/**` and file endpoint |
| NFR-SEC-02 | Tutor-only data is never exposed to students: private notes, preparation notes, answer keys and per-answer scores before release, and the tutor-only profile fields (contacts, phone, parents, level, strengths, weaknesses, learning notes, custom fields; see the [visibility matrix](../architecture/domain-model.md#visibility-matrix-what-a-student-can-see)) | DTO separation, the reflection test and the isolation suite |
| NFR-SEC-03 | Files are served only through authorized endpoints. There are no public or guessable URLs | File access tests |
| NFR-SEC-04 | No secrets in Git. Configuration comes from environment variables. `.env.example` holds placeholders only | Secret scan in CI, review |
| NFR-SEC-05 | Credentials never live in browser storage. Auth uses HttpOnly cookies | Review and E2E checks |
| NFR-PRIV-01 | Minimal personal data. Permanent delete is available. No third-party trackers, analytics or CDN fonts | Review |
| NFR-PERF-01 | p95 API latency < 300 ms for list and detail endpoints with 100 students and 5,000 activities on modest hardware (2 vCPU) | Load smoke before release 1.0 |
| NFR-PORT-01 | Development and tests run on Windows, macOS and Linux. Compose works with Docker; Podman where practical | Compat workflow, local setup doc |
| NFR-OPS-01 | Documented backup and restore of the database and files, tested before release 1.0 | Runbook drill evidence |
| NFR-MAINT-01 | Module boundaries are enforced by tests. No curriculum-specific code | Architecture test, review |
| NFR-I18N-01 | Every UI string comes from the vi and en catalogs. The key sets of both catalogs match | Catalog parity unit test |
