# AGENTS.md — keemese-english

Shared instructions for every AI coding agent (Claude Code, Codex, Cursor). Keep this file short (≤ 150 lines). Details live in `docs/` and are read **on demand**.

## What this is
A private teaching workspace for **one tutor** and the **students that tutor creates**: a flexible 1:1 LMS. Product source of truth: [`personal_english_tutor_teaching_workspace_spec.md`](personal_english_tutor_teaching_workspace_spec.md). Engineering scope: [`docs/product/scope.md`](docs/product/scope.md).

## Current state
Read **`progress.json`** first: phase, current task, branch, next task. The next task's packet is in `docs/delivery/tasks/`. If the repository disagrees with `progress.json`, the repository wins: fix `progress.json`.

## Invariants (never violate)
1. **Scope:** only build what traces to `FR-*` / `NFR-*` / `PD-*` ([requirements](docs/product/requirements.md), [decisions](docs/decisions/README.md)). Anything else is OPTIONAL / FUTURE: propose it, don't build it. Non-goals: sign-up, payment, marketplace or multiple tutors, chat or video, parent portal, AI features, built-in curricula.
2. **Generic engines:** no TOEIC/IELTS/THPT (or any curriculum) types, enums, tables, tags or seed content in code (§33).
3. **Content ≠ student activity:** library rows have no `student_id`. Student work is snapshotted on assign ([ADR-0009](docs/decisions/0009-snapshot-on-assign.md)).
4. **Student isolation:** in `/api/me/**` the student ID comes from the authenticated principal, never from input. Scoped queries; audience-specific DTOs; a miss → 404. Private notes, prep notes and unreleased answer keys never reach a student.
5. **Auth:** same-origin HttpOnly cookie + antiforgery ([ADR-0004](docs/decisions/0004-cookie-auth-same-origin.md)). Nothing credential-like in browser storage.
6. **Public repository:** no secrets, no real student data, no real screenshots. Invented fixtures only. `.env` is never edited by agents.
7. **Decided tech isn't switched** without a superseding ADR approved by the Lead Coordinator ([ADR index](docs/decisions/README.md)).
8. **No new runtime dependency** without a written justification and approval.
9. **Bilingual UI:** every string goes through i18n with both `vi` and `en` keys.
10. **Evidence or it didn't happen:** never claim a test, build or CI run passed unless you saw its result in this session. Record what was *not* run.

## Stack (pinned, see [ADR-0012](docs/decisions/0012-toolchain-pins.md))
.NET 10 (SDK 10.0.4xx), ASP.NET Core minimal APIs, EF Core 10 + Npgsql, PostgreSQL 18 · React 19, TypeScript 6.0, Vite 8, Tailwind v4, TanStack Router + Query, React Hook Form + Zod, shadcn/ui (Radix), i18next · xUnit v3 + Testcontainers, Vitest, Playwright + axe · Node 24 LTS + npm · Docker or Podman Compose.

## Layout
```text
src/Keemese.Api/        modular monolith (Modules/<Name>/…)   docs/backend/conventions.md
tests/                  UnitTests (no Docker), IntegrationTests (Testcontainers)
web/                    SPA (+ web/e2e Playwright)            docs/frontend/*
deploy/                 compose.yaml, Dockerfile              docs/operations/*
docs/                   product, architecture, decisions, security, frontend, testing, delivery, operations, agents, handoff
.claude/                agents, skills, hooks (Claude Code)
```
*(Code folders arrive in milestone M0.)*

## Commands (after M0)
```bash
dotnet build && dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests          # needs Docker/Podman
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web
npm run e2e --prefix web                            # stack running via deploy/compose.yaml --profile app
node --test ".claude/hooks/*.test.mjs"              # agent guard hook tests
```

## How to work (outer loop: [docs/agents/harness.md](docs/agents/harness.md))
1. Load state (`progress.json` → task packet → only the linked doc sections).
2. Plan the smallest complete increment. Identify the **risk ladder level** L1–L4 ([testing strategy](docs/testing/strategy.md)).
3. Implement within the packet's file ownership.
4. Verify with the checks for that level. Long runs in the background; read exit codes.
5. L3/L4 → independent `reviewer` (+ `security-reviewer` for auth, files, DTOs) ([operating model](docs/agents/operating-model.md)).
6. Record evidence + update `progress.json` + affected docs.
7. Ask the Lead Coordinator for merge approval. **Never merge, push to protected branches, or publish without approval.**

## Git
`master` = releases · `develop` = integration · `feature/*`, `fix/*` from `develop`. Conventional Commits. No force-push, no `reset --hard`, no history rewriting, no direct commits to `master`/`develop`. Merge only after approval.

## Context and handoff
Warn at **70 %** context, stop at **80 %** (use the tool's real indicator). At warn: finish the smallest safe unit, then follow [docs/agents/handoff.md](docs/agents/handoff.md) and write `docs/handoff/next-session.md` (≤ 4,000 chars, exactly one next task).

## Where to look
| Need | Read |
|---|---|
| Requirements, acceptance criteria | docs/product/requirements.md |
| Spec → requirement → module → milestone | docs/product/traceability.md |
| Domain, DB, API | docs/architecture/{domain-model,database,api}.md |
| Grading, attempts, progress math | docs/backend/activity-engine.md |
| Security rules, threats | docs/security/* |
| Screens, routes, design system, journeys | docs/frontend/* |
| Tests, CI | docs/testing/* |
| Milestones, risks, tasks | docs/delivery/* |
| Setup, deploy, recovery | docs/operations/* |
| Agent roles, plugins, tool differences | docs/agents/* |
