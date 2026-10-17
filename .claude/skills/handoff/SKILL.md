---
name: handoff
description: Record verified repository state and write the next-session prompt. Use when the context-monitor reports HANDOFF (≥320k tokens) or HARD STOP, after compaction, at the end of a session, or before switching tools.
---

Follow docs/agents/handoff.md exactly. Summary:

1. Reach a safe point (builds; no half-applied edits). Commit on the feature branch (`wip:` allowed).
2. Capture real state: `git status --short`, `git branch --show-current`, `git log --oneline -5`.
3. Update `progress.json` from that state (also `current_task.resume_at` and one `sessions[]` entry): current_task, branch, head_commit, completed, changed_files, tests (only commands actually run, real results), blockers, decisions, risks, next_task, last_updated.
4. Update docs touched by this session's decisions (ADR/PD/OD tables, the task packet "Status / notes").
5. Overwrite `docs/handoff/next-session.md` using the template in docs/agents/handoff.md. Exactly ONE next task. ≤ 4,000 characters; check with:
   `node -e "console.log(require('fs').readFileSync('docs/handoff/next-session.md','utf8').length)"`
6. Commit `chore(handoff): <task> state`. Do not push or merge without approval.
7. Blank-slate test: reread only AGENTS.md, progress.json, the handoff and the packet. Could a stranger continue? Fill any gap.
8. Tell the user the context size and ask them to start a new session. Stop.

Never mark tests as passed unless you saw the exit code in this session.
