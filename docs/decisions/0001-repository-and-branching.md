# ADR-0001: Repository layout, public GitHub repository, branching

Status: Accepted (2026-10-17)

## Context
Phase 0 found a folder with two Markdown files and no Git repository, so there were no existing branches to reconcile. The product owner asked for `master` (releases), `develop` (integration), and `feature/*` and `fix/*` from `develop`, with a **public** GitHub repository (PD-10).

## Decision
- Initialize Git with `master`. The first commit imports the spec unchanged. `develop` branches from it. Work happens on `feature/<topic>` and `fix/<topic>` cut from `develop`.
- The spec files stay at the repository root, unrenamed, because they are the source of truth. All derived docs live in `docs/`.
- Top-level layout once code exists:
  ```text
  src/Keemese.Api/            ASP.NET Core host + modules (ADR-0002)
  tests/Keemese.UnitTests/    no Docker needed
  tests/Keemese.IntegrationTests/  Testcontainers PostgreSQL
  web/                        Vite React SPA (+ web/e2e Playwright)
  deploy/                     compose.yaml, Dockerfile
  docs/                       documentation
  .claude/ AGENTS.md CLAUDE.md progress.json
  ```
- Merging into `develop` requires: green CI, the applicable checks from the [testing strategy](../testing/strategy.md), updated docs and `progress.json`, and **explicit approval from the Lead Coordinator**. Releases merge `develop → master` with a `vX.Y.Z` tag.
- No force-push, no history rewriting on shared branches. Branch protection is turned on for `master` and `develop` once the GitHub repository exists.

## Alternatives
- Trunk-based development (main only): simpler, but the owner asked for a release/integration split.
- GitHub Flow with `main`: rejected because the owner chose the `master` naming.

## Consequences
- Public repository: Actions minutes on standard runners are free, but **everything committed is public**. No real student data, credentials or private screenshots, ever. Fixtures use invented names.
- Claude Code `isolation: worktree` subagents branch from the default branch (`master`), **not** `develop`. Parallel implementers must use explicit `git worktree add … develop` instead ([operating model](../agents/operating-model.md#parallel-work)).

## Revisit when
Release cadence makes `develop` redundant (for example, a single maintainer releasing every merge).
