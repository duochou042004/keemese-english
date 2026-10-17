# ADR-0015: Progress is computed on read

Status: Accepted (2026-10-17)

## Context
§34 lists a `ProgressRecord` entity. Progress figures (§25) are all derivable from existing records: student activities and their scores, sessions and their statuses, goals, metric readings and plan items.

## Decision
No `progress_records` table. `Progress` is a **read-only module** that runs aggregate queries (one round trip per widget, indexed by `student_id`) and returns DTOs. Metric readings (`metric_readings`) are the only stored time series, and they exist because tutors enter them or release results into them (FR-GOAL-04).

## Consequences
- Figures can't drift from the source data. They are recomputed for free when grades change.
- At about 100 students this costs milliseconds. If p95 exceeds NFR-PERF-01, add an index or a cached projection first, and a table only as a last resort.
