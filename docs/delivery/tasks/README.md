# Task Packets

One file per task: `T-<milestone><nn>-<slug>.md` (M0 tasks are `T-001`…, M1 tasks `T-101`…). A packet is everything an agent needs to do the task **without chat history**.

## Template

```markdown
# T-XXX: <title>

- Milestone: Mx · Ladder level: Lx · Depends on: T-… · Branch: feature/<slug>
- Status: not_started | in_progress | in_review | done   (mirror progress.json)

## Objective
One sentence: the outcome.

## Requirements / acceptance criteria
- <FR/NFR/ADR id>: <what must be true, testable>

## Inputs (read these, nothing more)
- docs/...#anchor

## File ownership
- create/modify: <globs>
- must not touch: <globs>

## Out of scope
- <explicitly excluded items>

## Verification
- Commands: <exact>
- Evidence to record: <what>

## Status / notes
<updated by whoever works on it: decisions, surprises, links to evidence>
```

## Index

| Task | Title | M | Status |
|---|---|---|---|
| [T-001](T-001-backend-skeleton.md) | Backend skeleton, Compose PostgreSQL, test projects | M0 | not_started |
| [T-002](T-002-frontend-skeleton.md) | Frontend skeleton served by the API, i18n, tokens | M0 | not_started |
| [T-003](T-003-ci-and-repo-automation.md) | CI workflow, Dependabot, secret scan | M0 | not_started |
