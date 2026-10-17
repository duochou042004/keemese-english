# ADR-0010: One activity engine for assignments and assessments

Status: Accepted (2026-10-17)

## Context
The spec's assignment fields (§17: title, description, instructions, deadline, attachments, questions, score, pass mark, time limit) and assessment fields (§18: sections, questions, scoring, time limit, metadata) almost entirely overlap. The spec also forbids exam-specific engines (§18, §33).

## Decision
- One `Activity` aggregate with `kind ∈ {assignment, assessment}`. The kind is a **mechanism label** that sets UI wording and defaults (assignment: no time limit, unlimited attempts, a due date is usual; assessment: sections shown, a time limit is common, 1 attempt). It is never a curriculum.
- Sections are always present in the model. An assignment starts with one implicit section, which the UI hides until the tutor adds a second.
- One student-side flow (task → attempt → answers → submit → grading → release) serves both kinds.
- Question types are a closed set in code (PD-04), each one a small strategy: validate the payload, grade, and redact for students ([activity engine](../backend/activity-engine.md)).

## Alternatives
- Separate Assignment and Assessment modules: about twice the code, the same behavior, and the two would drift apart.

## Consequences
- "Assignments" and "Assessments" appear in the UI as two filters of one Activities area (proposed in OD-09).
