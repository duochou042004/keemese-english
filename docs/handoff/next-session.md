# Next session: T-001 Backend skeleton

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
Read AGENTS.md, then progress.json, then docs/delivery/tasks/T-001-backend-skeleton.md. Do not rely on any chat history.

## State (verified 2026-10-17)
- Phase 1 (documentation and architecture planning) is complete on branch `feature/planning-baseline`, awaiting the Lead Coordinator's approval to merge into `develop`.
- `master` and `develop` hold only the imported spec (commit adf3770). No GitHub remote yet (public repo approved in PD-10; the first push needs an explicit go-ahead).
- No product code exists. Only test evidence: guard hook tests (6/6 pass).
- Toolchain on the dev machine (Windows 11): .NET SDK 10.0.402, Node 24.21, npm 11.19, Docker Desktop 29.8 / Compose v5.6. Podman is not installed.

## Before starting
Confirm that `feature/planning-baseline` has been merged into `develop` (`git log develop --oneline -3`). If not, stop and ask the Lead Coordinator. Do not merge it yourself.

## The one next task
T-001: a buildable, testable .NET 10 backend skeleton that starts against PostgreSQL 18 in Compose, applies an initial migration (unaccent + f_unaccent), and serves /health/live and /health/ready. Unit and integration (Testcontainers) test projects are wired with one real test each.
Acceptance criteria: every bullet under "Requirements / acceptance criteria" in the packet.
Inputs: the packet's Inputs list only.
File ownership: as listed in the packet (no web/, no .github/).
Constraints: branch `feature/m0-backend-skeleton` from `develop`. Exact package versions are re-verified at install. No packages beyond the packet. No auth or features yet.

## Required verification
- Ladder level: L4.
- Commands: dotnet build -warnaserror; dotnet test tests/Keemese.UnitTests; docker compose -f deploy/compose.yaml up -d db; dotnet test tests/Keemese.IntegrationTests (background); dotnet run + GET /health/ready → 200.
- Record evidence in progress.json. Note that Podman was not tested.

## When done
Update progress.json and the packet's Status/notes, run the `reviewer` subagent (L4), then ask the Lead Coordinator for merge approval. Stop.
