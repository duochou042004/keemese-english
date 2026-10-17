# Session Handoff

Procedure (also packaged as the `handoff` skill in `.claude/skills/handoff/`). Use it at the context warn threshold, at the end of every session, or when switching tools.

## Steps

1. **Reach a safe point.** The build compiles, there are no half-applied edits, and the branch is committed (WIP commits are fine on feature branches: `wip: …`).
2. **Capture the real state** from the repository, not from memory:
   ```bash
   git status --short
   git branch --show-current
   git log --oneline -5
   ```
3. **Update `progress.json`:** `current_task.status`, `branch`, `head_commit`, `completed[]`, `changed_files[]`, `tests[]` (only commands actually run, with the real result), `blockers[]`, `decisions[]`, `risks[]`, `next_task`, `last_updated`.
4. **Update durable docs** affected by decisions made this session: ADRs, PD/OD tables, the task packet's "Status / notes" section.
5. **Write `docs/handoff/next-session.md`**: the next-session prompt, **≤ 4,000 characters** (check with `node -e "console.log(require('fs').readFileSync('docs/handoff/next-session.md','utf8').length)"`). It must name **exactly one next task**.
6. Commit: `chore(handoff): <task> state`.

## Handoff prompt template (≤ 4,000 chars)

```markdown
# Next session: <TASK-ID> <title>

You are continuing work on keemese-english (a private 1:1 tutoring workspace).
Read AGENTS.md, then progress.json, then docs/delivery/tasks/<TASK-ID>.md. Do not rely on any chat history.

## State (verified <date>)
- Branch: <branch> @ <short sha> (base: develop @ <sha>)
- Done in previous session: <1–3 bullets with evidence refs>
- Uncommitted work: none | <describe>
- Blockers: none | <describe + who must act>

## The one next task
<TASK-ID>: <objective in one sentence>
Acceptance criteria: <IDs + one-line each>
Inputs: <doc paths/anchors>
File ownership: <globs>
Constraints: <scope limits, approvals needed, no new deps without approval>

## Required verification
- Ladder level: L<n>
- Commands: <exact commands>
- Record evidence in progress.json; do not mark pass without seeing the exit code.

## When done
Update progress.json + task packet, run the reviewer subagent if L3/L4, then ask the Lead Coordinator for merge approval. Stop.
```

The current handoff lives at [`docs/handoff/next-session.md`](../handoff/next-session.md). Older handoffs are not kept as files; Git history has them.
