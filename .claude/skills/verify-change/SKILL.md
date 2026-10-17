---
name: verify-change
description: Pick and run the risk-proportional checks for the current diff (L1–L4), then record evidence. Use before asking for review or merge, and after fixing a failing test.
---

Source of truth: docs/testing/strategy.md (risk ladder, path → level table, failure handling, evidence format).

1. List changed files: `git diff --name-only develop...HEAD` (plus `git status --short` for uncommitted files).
2. Map every path to its minimum level using the "Test selection rules" table. The change's level = the highest of these. Shared UI, API client, router/query setup, security, Identity, student DTOs and redaction are always L4.
3. Run the checks for that level. Use `--filter` (dotnet) or `-t` / `-g` (Vitest/Playwright) for L1/L2. Long runs (integration, E2E, compose build) go in the background; wait for completion and read the exit code.
4. If something fails: reproduce the single test, fix it, rerun it plus its regression set, and widen only if the fix touched shared behavior or the cause is unclear.
5. Append an evidence entry to `progress.json` → `evidence[]` (format in strategy.md), including `not_run` with reasons.
6. Report: level, commands, results (summary lines), what was not run.
