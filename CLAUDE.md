@AGENTS.md

## Claude Code specifics

- **Subagents** (`.claude/agents/`): `researcher` (read-only, sonnet), `backend-dev`, `frontend-dev`, `reviewer`, `security-reviewer`. Every delegation uses the contract in docs/agents/operating-model.md#subagent-contract-every-delegation-includes-all-of-these. Start with ≤ 2 in parallel. Verify their claims yourself.
- **Do not use `isolation: worktree` for implementers.** It branches from the default branch (`master`), not `develop`. Use `git worktree add ../keemese-wt-<task> -b feature/<task> develop` instead.
- **Skills** (`.claude/skills/`): `handoff` (context warn / end of session), `verify-change` (pick and run ladder checks), `new-adr` (user-invoked).
- **Guard hook** (`.claude/hooks/guard.mjs`): block force-push, `reset --hard`, `git clean -f`, discarding all changes, recursive deletes outside build folders, commits/merges on `master`/`develop`, and edits to real `.env` files. A block (exit 2) is a hard stop: don't work around it, ask the Lead Coordinator.
- **Context:** hooks measure the real token count. `[context-monitor]` messages in your context are binding (WARN 250k / HANDOFF 320k / HARD STOP 400k). The status line shows the same numbers to the user. After compaction, hand off immediately (docs/agents/handoff.md).
- **Session start:** the SessionStart hook injects a repository briefing. Resolve any "Inconsistencies" it lists before other work.
- **Long runs** (integration tests, E2E, compose builds): `run_in_background`, then wait for the completion notification. No polling, no duplicate runs.
- **Ponytail plugin** is active (user scope): follow its minimal-change guidance, but it never overrides validation, security, accessibility, tests, i18n or docs requirements (docs/agents/plugins.md). Don't change its configuration.
