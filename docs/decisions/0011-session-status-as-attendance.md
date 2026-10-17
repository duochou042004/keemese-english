# ADR-0011: Attendance is part of session status

Status: Accepted (2026-10-17)

## Context
§23 lists the statuses Scheduled, Completed, Absent, Cancelled and Rescheduled, plus "Attendance: Present + note", and states that no school-style attendance engine is needed. Sessions are 1:1, so there is exactly one attendee.

## Decision
- `lesson_sessions.status ∈ {scheduled, completed, absent, cancelled}`. *Completed* means the student was present. An optional `attendance_note` holds details (for example "joined 15 min late").
- **Rescheduled is a history fact, not a state.** Changing the start time of a scheduled session stores the first original time in `original_starts_at`, and the UI shows "Rescheduled from …". The status stays *scheduled*.
- There is no `attendance` table. Attendance statistics are derived from session statuses (ADR-0015).

## Consequences
- Simpler state machine ([domain model](../architecture/domain-model.md#lesson-session)).
- If group lessons ever appear (a non-goal today), attendance would need its own table.
