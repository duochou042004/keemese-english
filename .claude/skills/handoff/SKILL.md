---
name: handoff
description: Record verified repository state and write the next-session prompt. Use at the 70% context warning, at the end of a session, or before switching tools.
---

Follow docs/agents/handoff.md exactly. Summary:

1. Reach a safe point (builds; no half-applied edits). Commit on the feature branch (`wip:` allowed).
2. Capture real state: `git status --short`, `git branch --show-current`, `git log --oneline -5`.
3. Update `progress.json` from that state: current_task, branch, head_commit, completed, changed_files, tests (only commands actually run, real results), blockers, decisions, risks, next_task, last_updated.
4. Update docs touched by this session's decisions (ADR/PD/OD tables, the task packet "Status / notes").
5. Overwrite `docs/handoff/next-session.md` using the template in docs/agents/handoff.md. Exactly ONE next task. ≤ 4,000 characters; check with:
   `node -e "console.log(require('fs').readFileSync('docs/handoff/next-session.md','utf8').length)"`
6. Commit `chore(handoff): <task> state`. Do not push or merge without approval.

Never mark tests as passed unless you saw the exit code in this session.
