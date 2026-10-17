# Context Budget and Session Handoff

This project spans many sessions, and **every new session starts with no memory**. Continuity therefore lives only in the repository: Git, `progress.json`, task packets, docs and `docs/handoff/next-session.md`. This page is the single authority on *when* to hand off, *how* to hand off, and *how* to resume. The `handoff` skill (`.claude/skills/handoff/`) packages the procedure.

## Thresholds

Reasoning quality degrades and token cost rises as the context grows, **in absolute terms, whatever the model's window size**. Community experience (adopted by the product owner on 2026-10-17): keep sessions under **400k tokens**, and treat **500k** as the point where reasoning quality is unacceptable. A handoff itself costs about 20–50k tokens, so it has to **start** well before 400k.

| Tier | Context size (1M window) | Agent behavior |
|---|---|---|
| **OK** | < 250k | Normal work |
| **WARN** | ≥ 250k | Finish the current smallest safe unit. Don't start new sub-tasks or large reads; send exploration to subagents |
| **HANDOFF** | ≥ **320k** | Stop feature work now. Reach a safe point and run the handoff procedure below. Tell the user that a new session is needed |
| **HARD STOP** | ≥ **400k** | Only complete the handoff (progress, handoff prompt, commit), then stop |
| **NEVER** | 500k | Must never be reached |

**Effective threshold = min(absolute, % of the window).** The percentage fallback (WARN 50 %, HANDOFF 60 %, HARD STOP 75 %) applies to smaller windows. For example, a 200k-token model hands off at 120k. The values live in `progress.json` → `policy.context` and can be tuned there. The hooks and the status line read them from that file.

The **old 70 % / 80 % rule is replaced.** On a 1M window it would have meant 700k / 800k, far past the safe zone.

## How context is measured (never guessed)

| Tool | Source of truth | Automatic warning to the agent |
|---|---|---|
| Claude Code | `.claude/hooks/context-monitor.mjs` reads the **actual token usage of the latest API request** from the session transcript (`input + cache_creation + cache_read + output`) after every tool call and every user prompt | **Yes.** It injects `[context-monitor] … WARN / HANDOFF NOW / HARD STOP` into the agent's context when a tier is crossed, and repeats it at HANDOFF and above. The status line (`.claude/statusline.mjs`) shows `[ctx 312k · handoff@320k · WARN]` to the human |
| Codex | The TUI shows the context left. Convert it: used = window − left | No hooks. The **human** watches the indicator, and the agent checks it before each task step |
| Cursor | The context usage indicator in the chat UI | No hooks. Same as Codex |

When no indicator is available, use proxies and hand off early: after about 60 tool calls, about 30 large file reads, or 2 completed ladder-L3 tasks in one session.

**Compaction is not a handoff.** Auto-compaction summarizes the conversation lossily. If it happens anyway, the SessionStart hook (`source: compact`) tells the agent to treat it as a **forced handoff point**: write the handoff immediately, then continue in a new session.

## Handoff procedure (outgoing session)

1. **Safe point.** The build compiles and the tests touched in this session pass (or the failure is recorded). No half-applied edits. Commit on the feature branch (`wip:` commits are fine).
2. **Capture facts from the repository**, not from memory:
   ```bash
   git status --short
   git branch --show-current
   git log --oneline -5
   ```
3. **Update `progress.json`**:
   - `current_task`: status, branch, and `resume_at`, the exact next step (file plus what to do).
   - `head_commit`: the SHA after step 6's commit. Writing the previous SHA plus "+ handoff commit" is acceptable.
   - `evidence[]` and `tests[]`: only commands **actually run this session**, with the real result and a `not_run` list.
   - `blockers`, `decisions`, `risks`, `next_task`, `last_updated`.
   - Append one entry to `sessions[]`: `{date, tool, task, context_at_handoff, outcome}`.
4. **Promote every decision to a durable doc.** Nothing important may live only in chat: ADRs, PD/OD tables, the task packet's *Status / notes*, `docs/delivery/risks.md`.
5. **Write `docs/handoff/next-session.md`** from the template below: **≤ 4,000 characters**, **exactly one next task**.
6. **Commit** `chore(handoff): <task> state`. Pushing a feature branch is allowed. Never merge without approval.
7. **Run the blank-slate test.** Reread only `AGENTS.md`, `progress.json`, the handoff prompt and the packet. Could a stranger continue correctly from those alone? If any fact you'd need is missing, add it.
8. **Tell the user**: what was done, what's verified, the context size, "please start a new session". Then stop.

### Handoff prompt template (≤ 4,000 chars)

```markdown
# Next session: <TASK-ID> <title>

You are continuing work on keemese-english (a private 1:1 tutoring workspace).
Your session briefing (SessionStart hook) shows the live repo state. Then read AGENTS.md,
progress.json and docs/delivery/tasks/<TASK-ID>.md. Do not rely on chat history.

## State (verified <date>, at <sha>)
- Branch: <branch> (base develop @ <sha>); uncommitted: none | <list>
- Done last session: <1–3 bullets, each with its evidence: command → result>
- In progress: <exact resume point: file, function, what remains>
- Known failing or unverified: <list or "none">
- Blockers / waiting on Lead Coordinator: <list or "none">

## The one next task
<TASK-ID>: <objective>. Acceptance criteria: <IDs>. Inputs: <doc anchors>.
File ownership: <globs>. Constraints: <scope limits, approvals>.

## Verify before building on it
<the 1–2 commands that prove the previous session's claims still hold>

## Required verification for this task
Ladder L<n>: <commands>. Record evidence in progress.json; never mark pass without seeing the exit code.

## Stop conditions
Context ≥ HANDOFF tier → handoff (docs/agents/handoff.md). Task done → reviewer (L3/L4), then ask for merge approval.
```

<a id="resume-protocol-new-session"></a>

## Resume protocol (new session)

1. **Read the session briefing.** `.claude/hooks/session-start.mjs` injects, automatically at startup, resume, `/clear` and compaction: branch, HEAD, uncommitted files, upstream divergence, the `progress.json` summary, owner actions waiting, **inconsistency warnings** (wrong branch, stale handoff, broken `progress.json`) and the full handoff prompt. Codex and Cursor sessions: run `node .claude/hooks/session-start.mjs` once and read the output.
2. **Resolve inconsistencies first.** The repository wins. Fix `progress.json` or the handoff before any new work.
3. Read `AGENTS.md` (already loaded in Claude Code), the task packet, and **only** the doc sections the packet links to.
4. **Verify before trusting.** Re-run the "Verify before building on it" commands. If a claim doesn't hold, record it and fix that first.
5. Confirm that the next task needs no pending owner approval (`pending_owner_actions`). If it does, ask and stop.
6. Work in the outer loop ([harness.md](harness.md)).

## Session sizing (prevention beats handoff)

- **Size each task packet to fit one session**, roughly ≤ 200k tokens of work. Every packet declares `Session budget: 1 session`. If a task can't fit, split it before starting.
- **One task per session.** After merging one task, hand off instead of starting the next in the same session, unless the session is still under the WARN tier.
- **Keep the main context lean.** Delegate searches and multi-file reading to `researcher` (it returns a summary of ≤ 300 words). Read files by section (offset/limit) rather than whole. Never paste logs: summarize the failing lines. Run long commands in the background and read only the summary.
- **Always-loaded files stay small:** `AGENTS.md` ≤ 150 lines, `CLAUDE.md` ≤ 40 lines. The SessionStart briefing stays ≤ 9,000 characters.
