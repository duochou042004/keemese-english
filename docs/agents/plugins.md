# Plugin Conventions (AI developer tooling only)

**Scope clarification:** the product spec contains **no** requirement for a customer-facing plugin store, extension marketplace or LMS plugin system. Building one would violate §45 and §58. "Plugins" in this repository means **extensions to the AI coding tools** used to develop it (Claude Code plugins, skills and MCP servers). Product extensibility happens through code (for example a new question type is one class, see the [activity engine](../backend/activity-engine.md#question-type-strategy)), not through plugins.

## Policy

| Rule | Detail |
|---|---|
| Inventory | Every plugin or MCP server relied on for this project is listed below with its purpose and scope |
| Install / upgrade / config changes | **Only with Lead Coordinator approval.** Agents never install, update, enable or disable plugins on their own |
| Project vs user scope | Project-required tooling goes in `.claude/settings.json` (committed). Personal preferences stay in user settings (not committed) |
| Trust | Only plugins from trusted marketplaces. Review what hooks and commands a plugin adds before enabling it |
| No product dependency | The app must build, test and run with **zero** AI plugins installed |
| Evaluate, don't assume | A plugin claiming savings (tokens, time) is judged by observed results at milestone gates ([harness evaluation](harness.md#evaluation-protocol-for-agent-work)) |

## Inventory

| Plugin | Scope | Status (verified read-only 2026-10-17) | Use in this project |
|---|---|---|---|
| **Ponytail** | User (Claude Code) | Installed and **active**, level `full`, loaded by a SessionStart hook. Skills available: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`. Its optional statusline badge isn't configured | Minimal-implementation guidance (see below) |

### Ponytail usage rules

Use it for: reusing existing code first, the smallest complete change, no speculative abstractions, smaller diffs and shorter replies, `shortcut:` comments for known limits (listed with `/ponytail-debt`).

**It never overrides this project's requirements.** Required validation, security controls, error handling, accessibility, meaningful tests, i18n parity and documentation updates are part of the "complete" change, and are never cut for brevity. If Ponytail's guidance conflicts with a requirement, an ADR or the review checklist, the project rule wins.

Useful commands at gates: `/ponytail-review` as an extra lens on a diff (it doesn't replace the `reviewer` subagent), `/ponytail-debt` to list deferred shortcuts before a release. Do not change its level or configuration without approval.

Impact is not assumed: at each milestone gate, note in the evidence file whether the diffs stayed small without rework caused by missing pieces.
