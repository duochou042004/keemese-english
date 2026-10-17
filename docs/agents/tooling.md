# Tool-specific Instructions: Claude Code · Codex · Cursor

All three follow the same rules (`AGENTS.md`), the same outer loop ([harness.md](harness.md)) and the same role contracts ([operating-model.md](operating-model.md)). This page lists **only the differences**. Facts were checked against the official docs on 2026-10-17. Codex and Cursor are not installed on the main dev machine, so their behavior here is documented but not yet exercised.

| Concern | Claude Code | Codex | Cursor |
|---|---|---|---|
| Always-loaded rules | `CLAUDE.md` (imports `@AGENTS.md`) + nested `CLAUDE.md` files | `AGENTS.md` chain from the repo root down to the working directory (+ `~/.codex/AGENTS.md`); `AGENTS.override.md` wins per directory; **32 KiB combined default limit** | `AGENTS.md` (root and nested) and/or `.cursor/rules/*.mdc` (`alwaysApply`, `globs`, `description`) |
| Subagents | `.claude/agents/*.md` (frontmatter: `name`, `description`, `tools`, `model`, `isolation`, `maxTurns`, …) | No project subagent files. Run roles as separate Codex sessions or tasks, pasting the role contract from [operating-model.md](operating-model.md) | No project subagent files. Use separate chats or background agents with the role contract |
| Skills / reusable procedures | `.claude/skills/<name>/SKILL.md` | Not read automatically. Point at `.claude/skills/<name>/SKILL.md` in the prompt ("follow the procedure in …") | Same: reference the file, or add a manual `.mdc` rule if it's used often |
| Deterministic hooks | `.claude/settings.json` `PreToolUse` → `guard.mjs` | None. Rely on Codex sandbox and approval modes + CI + branch protection | None. Rely on CI + branch protection |
| Context indicator | Measured from the transcript by `context-monitor.mjs` hook + status line (`.claude/statusline.mjs`) | TUI "context left" (used = window − left); the human watches it | Chat context indicator; the human watches it |
| Session start briefing | Automatic (SessionStart hook) | Run `node .claude/hooks/session-start.mjs` first | Same as Codex |
| Worktrees | `isolation: worktree` (branches from the **default** branch); prefer manual `git worktree add … develop` | Manual `git worktree` | Manual `git worktree` |
| Long-running commands | Background Bash/PowerShell + completion notifications | Run in the background where supported; otherwise run once and wait | Same |

## Rules that hold everywhere

1. Read `progress.json` and the task packet first. Don't start a task that isn't `next_task` without Lead Coordinator approval.
2. Don't create tool-specific copies of project rules. If a tool needs a rule file, it **points to** `AGENTS.md` or a doc rather than duplicating it.
3. If a tool lacks hooks, the agent must still obey the hook rules ([harness.md](harness.md#hooks)) manually.
4. Update `progress.json` in the same format whichever tool did the work, and set `"tool"` in each evidence entry.

## Why there is no `.cursor/rules/` yet

Cursor reads `AGENTS.md` natively, so a rule file would only duplicate it. Add a glob-scoped `.mdc` (for example `web/**` → "read docs/frontend/design-system.md first") only if Cursor sessions measurably miss those docs.
