# Keemese English: a private 1:1 teaching workspace

A workspace for **one tutor** to manage their students: profiles, goals, personal learning plans, a reusable content library, a question bank, assignments and assessments with auto and manual grading, feedback, lesson scheduling and attendance, private notes, and progress. Students log in (with accounts created by the tutor) to see only their own lessons, tasks, materials, results and progress. The UI is in Vietnamese and English.

It is **not** a school LMS, marketplace, booking or payment platform, chat or video tool, or an AI tutor. See [docs/product/scope.md](docs/product/scope.md).

## Status

**Planning baseline (Phase 1).** No product code yet. The first implementation milestone (M0, walking skeleton) is defined in [docs/delivery/milestones.md](docs/delivery/milestones.md). Live state: [`progress.json`](progress.json).

## Documentation map

| Area | Start here |
|---|---|
| Product spec (source of truth) | [docs/spec/personal_english_tutor_teaching_workspace_spec.md](docs/spec/personal_english_tutor_teaching_workspace_spec.md) |
| Scope, requirements, traceability | [docs/product/](docs/product/) |
| Architecture, domain, database, API | [docs/architecture/](docs/architecture/) |
| Decisions (ADRs, product and open decisions) | [docs/decisions/README.md](docs/decisions/README.md) |
| Backend conventions, activity engine | [docs/backend/](docs/backend/) |
| Security model, threat model | [docs/security/](docs/security/) |
| Frontend IA, design system, UX journeys | [docs/frontend/](docs/frontend/) |
| Testing strategy, CI | [docs/testing/](docs/testing/) |
| Milestones, risks, task packets | [docs/delivery/](docs/delivery/) |
| Local setup, deployment, runbooks | [docs/operations/](docs/operations/) |
| AI agent workflow | [AGENTS.md](AGENTS.md), [docs/agents/](docs/agents/) |

## Development

Prerequisites and commands: [docs/operations/local-setup.md](docs/operations/local-setup.md) (Windows, macOS, Linux; Docker or Podman).
