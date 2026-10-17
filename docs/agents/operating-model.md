# AI Agent Operating Model

How AI agents (Claude Code, Codex, Cursor) work on this repository. The outer control loop is in [harness.md](harness.md). Tool-specific differences: [tooling.md](tooling.md).

## Roles

| Role | Who | Owns | Must not |
|---|---|---|---|
| **Lead Coordinator** | The human product owner | Scope, priorities, approvals (merges into `develop`/`master`, new dependencies of consequence, PD/OD decisions, anything public or irreversible) | — |
| **Orchestrator** | The main agent session | Task selection from `progress.json`, the task packet, delegation, integration, **independent verification of subagent claims**, `progress.json` and evidence, the handoff | Merge without approval. Mark work done without evidence. Expand scope |
| **Researcher** | Subagent `researcher` (read-only) | Bounded questions: docs lookups, codebase exploration, version checks. Returns findings with file or URL references | Edit files |
| **Backend specialist** | Subagent `backend-dev` | Changes in `src/`, `tests/` for the assigned module | Touch `web/`, CI, or files outside the packet's ownership list |
| **Frontend specialist** | Subagent `frontend-dev` | Changes in `web/` for the assigned area | Touch `src/`, CI, or shared UI (`components/ui`, AppShell) unless the packet says so |
| **Reviewer** | Subagent `reviewer` (read-only + test commands) | Independent verdict against the acceptance criteria, the diff and the [review checklist](#review-checklist) | Edit code. Restate the implementer's summary as evidence |
| **Security reviewer** | Subagent `security-reviewer` (read-only + test commands) | The threat-model pass for L4 changes and milestone gates | Edit code |

Subagent definitions: `.claude/agents/*.md`. Codex and Cursor use the same role contracts as prompts (see [tooling.md](tooling.md)).

## When to delegate (and when not to)

Delegate only when it **saves context or time** on independent work:
- ✅ A research question whose answer is short but needs many file reads or fetches.
- ✅ An independent review (it must be a fresh context, so it doesn't inherit the implementer's assumptions).
- ✅ Two implementation tasks with **disjoint file ownership** and no dependency between them.
- ❌ A single small edit, a single command, anything the orchestrator already has the context for.
- ❌ Two agents editing the same files, or a task whose design isn't settled.

Start with **at most 2 parallel subagents**. Add more only with evidence that the previous runs were productive (recorded in the evidence log).

## Subagent contract (every delegation includes all of these)

```text
OBJECTIVE:      one sentence, the outcome, not the activity
INPUTS:         task packet path, relevant doc sections (paths + anchors), the current branch/commit
FILE OWNERSHIP: exact paths/globs this agent may modify (empty for read-only roles)
TOOLS:          allowed tools (from its agent definition; narrower if needed)
DELIVERABLE:    what to return (diff summary + changed files + commands run + exit codes + open issues), ≤ 300 words
DONE WHEN:      the acceptance criteria IDs this work must satisfy + the checks that must pass
STOP IF:        scope creep, a needed file outside ownership, a failing check whose fix is outside ownership, a design question
```

The orchestrator then **verifies independently**: reads the diff, reruns the stated checks (or the narrowest proving subset), and compares the result with the subagent's claims. Discrepancies are recorded.

<a id="parallel-work"></a>

## Parallel work
- Parallel implementers each get their own **git worktree on their own branch cut from `develop`**:
  `git worktree add ../keemese-wt-<task> -b feature/<task> develop`.
  Don't rely on Claude Code `isolation: worktree` for implementers: it branches from the **default branch (`master`)**, not `develop` (ADR-0001).
- One writer per file set. Shared files (`AppDbContext`, `Program.cs`, `routeTree.gen.ts`, locale catalogs, `progress.json`) are edited **only by the orchestrator** during integration, or by exactly one specialist named in the packet.
- Integration order: backend first (API contract), regenerate API types, then frontend.

<a id="scope-guardrail"></a>

## Scope guardrail (§58)
Before adding anything not traced to an `FR-*`/`NFR-*`/`PD-*`, ask: does it move the product toward a center LMS, marketplace, booking, payment, social, AI, conferencing or school-ERP system? If **yes**, or if unsure: don't build it. Record it as an `OD-xx` proposal in [decisions](../decisions/README.md) and tell the Lead Coordinator. Unapproved additions stay **OPTIONAL / FUTURE**.

<a id="review-checklist"></a>

## Review checklist
The reviewer answers each with ✅ / ❌ + evidence (file:line or command output):

1. **North star (§61):** does this make the tutor's day easier than Zalo + Drive + Word + Meet + Sheets?
2. Every changed behavior traces to an acceptance criterion. Nothing outside the packet scope.
3. No curriculum-specific code (TOEIC/IELTS/etc.) and no hard-coded tags or metrics (§33, §53).
4. Module boundaries (ADR-0002); no cross-module internals.
5. Student isolation: student ID from the principal, scoped queries, audience DTOs, isolation suite updated.
6. Validation at trust boundaries; error codes, not prose; no PII in logs.
7. Tests at the right ladder level and passing (rerun, not trusted); `not_run` declared.
8. Frontend: tokens and components reused, all states designed, keyboard and axe clean, 4 widths × 2 languages checked for new or changed screens.
9. Minimal: no speculative abstractions, no unjustified dependencies, the smallest diff that fully solves the task.
10. Docs, `progress.json` and the API types are updated.

Verdict: `APPROVE` / `CHANGES REQUESTED` (with a numbered list). The reviewer never approves its own work, and the orchestrator never treats a reviewer verdict as a substitute for the Lead Coordinator's approval to merge.

## Git rules for agents

- Branch per task: `feature/<area>-<short>` or `fix/<short>` from `develop`. Small diffs. Commit messages follow Conventional Commits (`feat(students): …`).
- **Never**: force-push, `reset --hard` on shared work, rewrite published history, delete branches that aren't merged, commit to `master`/`develop` directly, push or publish without approval, commit secrets or real personal data. A hook enforces part of this ([harness.md](harness.md#hooks)).
- Delete a merged feature branch only after confirming it's merged and no open work depends on it.
