# Requirement Traceability

Shape: `Spec section → requirement(s) → module → milestone → scope`, as §60.I requires. Modules are defined in [architecture/overview.md](../architecture/overview.md#modules). Milestones are in [delivery/milestones.md](../delivery/milestones.md).

Scope values: **MVP** · **P2** (Phase 2) · **FUT** (Phase 3 / Future) · **NON-GOAL** · **PROCESS** (governs how we build, not a feature).

| Spec § | Topic | Requirement IDs | Module | M | Scope |
|---|---|---|---|---|---|
| 1 | Overview: 1:1, single tutor | Scope doc, A8 | — | — | MVP |
| 2 | Philosophy: tools, not curriculum | NFR-MAINT-01, all `FR-*` "no predefined" ACs | all | all | MVP |
| 3.1 | One tutor, all permissions | FR-AUTH-03 | Identity | M1 | MVP |
| 3.2 | Student, no admin rights | FR-AUTH-01, NFR-SEC-01 | Identity | M1 | MVP |
| 4.1 | No public registration | FR-AUTH-02 | Identity | M1 | MVP |
| 4.2 | Tutor creates student account | FR-STU-01, FR-AUTH-04 | Students, Identity | M1 | MVP |
| 4.3 | Login, logout, change password | FR-AUTH-01, -05 | Identity | M1 | MVP |
| 4.3 | Forgot password "later" | FR-AUTH-06 (tutor reset); self-service = PD-07 | Identity | M1 | MVP / FUT |
| 5.1 | No enrolment, leads, self-enrolment | — | — | — | NON-GOAL |
| 5.2 | No payment | — | — | — | NON-GOAL |
| 5.3 | No marketplace or multi-tutor | A8 | — | — | NON-GOAL |
| 5.4 | No AI | — | — | — | NON-GOAL |
| 5.5 | No chat or video; store meeting URL | FR-LES-02, FR-LES-07 | Lessons | M5 | MVP (link only) |
| 5.6 | No parent portal; store parent info | FR-STU-05 | Students | M1 | MVP (data only) |
| 6, 7 | Student workspace at the centre | FR-STU-07 | Students (+ all) | M1→M7 | MVP |
| 8 | Flexible learning profile | FR-STU-04 | Students | M2 | MVP |
| 9 | Multiple goals, extensible metrics | FR-GOAL-01..04 (M2, M4); student view FR-GOAL-05 (M7) | Students (Goals) | M2, M4, M7 | MVP |
| 10 | Learning plan editing | FR-PLAN-01..05 | LearningPlans | M6 | MVP |
| 11 | Learning plan templates | FR-PLAN-06, PD-01 | LearningPlans | — | P2 |
| 12 | Content library, free folders | FR-CONT-01, -05, -08 | Content | M3 | MVP |
| 13 | Content types: file and native | FR-CONT-02, -03, -04 | Content | M3 | MVP |
| 14 | Lesson builder | FR-LES-01 | Lessons | M5 | MVP |
| 15 | Reusable content vs student state | FR-ACT-03, -13, ADR-0009 | Activities | M4 | MVP |
| 16 | Question bank | FR-QB-01..05 | QuestionBank | M4 | MVP |
| 17 | Assignment engine, question types | FR-ACT-01, FR-QB-03, PD-04 | Activities, QuestionBank | M4 | MVP (7 types) / P2 (matching, ordering, audio recording) |
| 18 | Generic assessment engine | FR-ACT-01, -02, -05, ADR-0010 | Activities | M4 | MVP |
| 19 | Submission, auto and manual grading | FR-ACT-04, -07, -08, -11 | Activities | M4 | MVP |
| 20 | Teacher feedback (rubric, comments) | FR-ACT-08, -09, PD-06 | Activities | M4 | MVP (rubric + text) / P2 (annotation UI) |
| 21 | Vocabulary | PD-03 | — | — | P2 |
| 22 | Schedule, no self-booking | FR-LES-02, -03 | Lessons | M5 | MVP |
| 23 | Attendance statuses | FR-LES-04, ADR-0011 | Lessons | M5 | MVP |
| 24 | Private teacher notes | FR-NOTE-01..03 | Students (Notes) | M2 | MVP |
| 25 | Progress, configurable metrics | FR-PROG-01, -03, FR-GOAL-02, -04, FR-ACT-12 | Progress | M7 | MVP |
| 26 | Student dashboard; sees only own data | FR-DASH-02, FR-PROG-02, FR-GOAL-05, NFR-SEC-01, OD-08 | Progress, all `/me` | M1→M7 | MVP |
| 27 | Tutor dashboard, action-first | FR-DASH-01, FR-ACT-14 | Progress | M1→M7 | MVP |
| 28 | Daily tutor workflow | FR-LES-05, journey J1 | Lessons | M5 | MVP |
| 29 | Student daily workflow | FR-ACT-04, FR-DASH-02, journey J5 | Activities | M4, M7 | MVP |
| 30 | Per-student personalization | FR-PLAN-*, FR-GOAL-*, FR-PLAN-AC3 | LearningPlans, Students | M2, M6 | MVP |
| 31 | Course = template only | PD-01 | — | — | P2 |
| 32 | Content vs activity data rule | ADR-0009, FR-ACT-13, FR-QB-AC1 | Activities | M4 | MVP |
| 33 | Generic engine principle | NFR-MAINT-01, [domain model](../architecture/domain-model.md) | all | all | MVP |
| 34 | Entity direction (not final) | [domain model](../architecture/domain-model.md), [database](../architecture/database.md) | all | M0+ | MVP |
| 35 | Modular monolith | ADR-0002 | — | M0 | MVP |
| 36 | Tech direction, no gratuitous infra | ADR-0002..0008 | — | M0 | MVP |
| 37 | Security, A ≠ B | NFR-SEC-01..03, [security model](../security/security-model.md) | all | all | MVP |
| 38 | File management, not a Drive clone | FR-CONT-03, -04, -06, -07, ADR-0007 | Content (Files) | M3 | MVP |
| 39 | Notifications | PD-02 (dashboards instead) | — | — | P2 |
| 40 | UX principles | FR-UX-01..05, [design system](../frontend/design-system.md) | web | all | MVP |
| 41 | Information architecture | [IA](../frontend/information-architecture.md) (adjustments accepted as PD-08) | web | M1 | MVP |
| 42 | MVP list | This table, the MVP rows | — | M0–M7 | MVP |
| 43 | Phase 2 list | PD-01..07, scope doc | — | — | P2 |
| 44 | Phase 3 list | Scope doc | — | — | FUT |
| 45 | What the system is NOT | Scope doc, non-goals | — | — | NON-GOAL |
| 46 | Tutor stories: create and edit student (FR-STU-01, -02 → M1) · learning plan (FR-PLAN-01 → M6) · content (FR-CONT-01..02 → M3) · assignments from the bank (FR-ACT-01, FR-QB-01 → M4) · assessments (FR-ACT-01..02 → M4) · grade and comment (FR-ACT-08 → M4) · record a lesson (FR-LES-05 → M5) · see progress (FR-PROG-01 → M7) | as listed | Students, LearningPlans, Content, Activities, Lessons, Progress | M1–M7 | MVP |
| 47 | Student stories: log in (FR-AUTH-01 → M1) · see plan (FR-PLAN-05 → M6) · materials (FR-CONT-07 → M3) · complete assignments (FR-ACT-04 → M4) · scores and feedback (FR-ACT-09 → M4) · upcoming lessons (FR-LES-03, FR-LES-AC5 → M5) | as listed | Identity, LearningPlans, Content, Activities, Lessons | M1–M6 | MVP |
| 48 | After-lesson scenario (most critical) | FR-LES-05, AC1, journey J1 | Lessons | M5 | MVP |
| 49 | Create-student scenario | FR-STU-01, AC1, AC4, journey J2 | Students | M1 | MVP |
| 50 | Create-assessment scenario | FR-ACT-01..03, AC4, journey J3 | Activities | M4 | MVP |
| 51 | Success criteria | All MVP rows; release gate checklist | — | M7 | MVP |
| 52 | Agent design steps | Phase 1 docs (this set) | — | P1 | PROCESS |
| 53 | Forbidden assumptions | Scope doc principles; review checklist | — | all | PROCESS |
| 54 | Non-functional priorities | Scope doc principle 5 | — | all | PROCESS |
| 55 | Product character, daily questions | FR-DASH-01, AC1 | Progress | M7 | MVP |
| 56 | Final conceptual model | [domain model](../architecture/domain-model.md) | all | — | MVP |
| 57 | One-sentence definition | Scope doc | — | — | MVP |
| 58 | Scope guardrail | [agents operating model](../agents/operating-model.md#scope-guardrail) | — | all | PROCESS |
| 59 | Research context | Not normative | — | — | — |
| 60 | Planning deliverables A–I | This doc set (see the coverage table below) | — | P1 | PROCESS |
| 61 | North star | Review checklist question 1 | — | all | PROCESS |

## §60 deliverable coverage

| §60 item | Where |
|---|---|
| A. Product analysis | [scope.md](scope.md), [decisions](../decisions/README.md) (ambiguities = PD/OD) |
| B. Domain design | [domain-model.md](../architecture/domain-model.md) |
| C. Database | [database.md](../architecture/database.md) |
| D. Backend | [api.md](../architecture/api.md), [backend conventions](../backend/conventions.md), [activity engine](../backend/activity-engine.md), [security model](../security/security-model.md) |
| E. Frontend | [information-architecture.md](../frontend/information-architecture.md), [design-system.md](../frontend/design-system.md) |
| F. UX | [ux-journeys.md](../frontend/ux-journeys.md): Add student (J2), create lesson and schedule (J7), after-lesson (J1), create assignment (J9), create assessment (J3), grading (J4), student homework (J5), plan editing (J6), progress view (J8). The student workspace structure is in [IA](../frontend/information-architecture.md#student-workspace-tabs) |
| G. Testing | [testing/strategy.md](../testing/strategy.md) |
| H. Delivery plan | [delivery/milestones.md](../delivery/milestones.md) |
| I. Scope verification | This file |

## Items with no requirement (kept out of core)

These came up during planning. They are **OPTIONAL / FUTURE / REQUIRES PRODUCT DECISION**, tracked as `OD-xx` in [decisions](../decisions/README.md):

- Duplicate a session to next week (a stand-in for recurring lessons) — OD-01
- Product display name and branding — OD-02
- Upload size limits per file kind — OD-03 (defaults proposed)
- Student-visible lesson summary (proposed as part of FR-LES-05) — OD-04 confirms
- After-lesson entry from the Today dashboard as well as from the student (§48) — OD-07
- Learning profile hidden from students — OD-08
