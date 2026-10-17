# ADR-0009: Snapshot activity content when it is assigned

Status: Accepted (2026-10-17)

## Context
§15 and §32: one source activity is assigned to many students, and each student's status, answers, scores and feedback must be separate. Student actions must not change the source. A further question: what happens when the **tutor** edits a question after assigning it? If live references were used, grading of already-submitted work would change silently. Full versioning is Phase 2 (PD-05).

## Decision
When an activity is assigned, each new `student_activity` row stores a `snapshot` (`jsonb`): the settings, sections, items, question prompts, payloads, answer keys and points **as they were at that moment**. Each item gets a stable `itemKey`. Attempts, answers and grading read only from the snapshot.

- Materials (content items) are **not** snapshotted. They stay live references through grants, so fixing a typo in a PDF reaches students. The UI says this in the editor.
- The API strips answer keys and explanations from student responses until results are released (FR-ACT-09).
- "Update assigned copies" is **not** in MVP. The tutor can cancel an assignment and reassign it if needed.

## Alternatives
- Live references: rejected for the grading-integrity reason above.
- A shared `activity_versions` table that student activities point to: less duplication, but it needs version bookkeeping. At about 100 students the duplicated JSON costs nothing. **Revisit** when Phase 2 versioning arrives.

## Consequences
- Snapshot size is bounded (an activity of about 200 questions is roughly 200 KB of JSON).
- Reports group student activities by `activity_id`, even though the snapshots may differ.
