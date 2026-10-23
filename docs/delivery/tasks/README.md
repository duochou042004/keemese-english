# Task Packets

One file per task: `T-<milestone><nn>-<slug>.md` (M0 tasks are `T-001`…, M1 tasks `T-101`…). A packet is everything an agent needs to do the task **without chat history**.

## Template

```markdown
# T-XXX: <title>

- Milestone: Mx · Ladder level: Lx · Depends on: T-… · Branch: feature/<slug> · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
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
| [T-001](T-001-backend-skeleton.md) | Backend skeleton, Compose PostgreSQL, test projects | M0 | done |
| [T-002](T-002-frontend-skeleton.md) | Frontend skeleton served by the API, i18n, tokens | M0 | done |
| [T-003](T-003-ci-and-repo-automation.md) | CI workflow, Dependabot, secret scan | M0 | done |
| [T-101](T-101-pipeline-hardening.md) | Request pipeline hardening and the anonymous-endpoint test | M1 | in_review |
| [T-102](T-102-identity-and-login.md) | Identity, login/logout, antiforgery, tutor bootstrap and reset CLI | M1 | not_started |
| [T-103](T-103-password-lifecycle.md) | Password change, must-change gate, lockout, rate limits, preferences | M1 | not_started |
| [T-104](T-104-students-api-and-isolation-suite.md) | Students API, account actions, isolation and authorization suites | M1 | not_started |
| [T-105](T-105-api-types-and-fetch-wrapper.md) | Generated API types, CI freshness check, auth-aware fetch wrapper | M1 | not_started |
| [T-106](T-106-login-flow-and-e2e-harness.md) | Login, forced password change, guards, Playwright + axe, e2e-smoke | M1 | not_started |
| [T-107](T-107-appshell-and-dashboard-shells.md) | AppShell (tutor and student) and the Today / Home shells | M1 | not_started |
| [T-108](T-108-students-list-and-add-student.md) | Student list and Add student (J2) | M1 | not_started |
| [T-109](T-109-student-workspace-and-account-actions.md) | Student workspace shell, profile editing and account actions | M1 | not_started |
| [T-110](T-110-m1-gate.md) | M1 milestone gate | M1 | not_started |

M1 order: T-101 → T-102 → T-103 → T-104 (backend chain; they share `Program.cs` and `Infrastructure/Security`). T-105 can run beside T-103 in its own worktree once T-102 is merged. Then T-106 (needs T-103 + T-105) → T-107 → T-108 (also needs T-104) → T-109 → T-110.
