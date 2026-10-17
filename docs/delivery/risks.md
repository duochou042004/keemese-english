# Risk Register

L = likelihood, I = impact (H/M/L). Review it at every milestone gate. Owner: **O** = orchestrator, **LC** = Lead Coordinator.

| ID | Risk | L | I | Mitigation | Trigger / signal | Owner |
|---|---|---|---|---|---|---|
| R-01 | **Frontend quality**: generic, cramped or inconsistent UI that technically works | H | H | Design system + anti-pattern list; journeys designed first; visual QA at 4 widths × 2 languages with realistic data; reviewer checklist item 8; a usability check by the tutor at the M1, M5 and M7 gates | Review finds anti-patterns; the tutor prefers Zalo + Drive for a task | O, LC |
| R-02 | **Scope creep**: "useful" features pulling toward an LMS, booking or AI platform | M | H | Traceability rule, §58 guardrail, OD process, reviewer checklist item 2 | A PR with no FR/PD reference | O |
| R-03 | **Over-built generic engine** (form builders, JSON-schema everything) | M | H | Closed set of question types as strategies (ADR-0010); no plugin system; Ponytail minimalism | A type needs more than 1 class + UI | O |
| R-04 | **Student data leak** (IDOR, DTO leak, unreleased answer keys) | M | H | Structural scoping, audience DTOs, discovery-based isolation suite, security-reviewer at gates | A new `/api/me` route without a fixture (the test fails by design) | O |
| R-05 | File upload abuse (XSS via SVG or HTML, oversize) | L | H | Allowlist + sniffing, sandbox CSP, attachment disposition, size limits | — | O |
| R-06 | Deployment target unknown until late; the storage or cookie model doesn't fit | M | M | Portable single image + volume; S3 adapter seam; decide OD-06 before M7 | The host has no persistent volumes | LC |
| R-07 | Cross-platform drift (CRLF, casing, bash-only scripts) | M | M | `.gitattributes`, `.editorconfig`, Node scripts only, weekly compat workflow | Compat workflow fails | O |
| R-08 | Podman compatibility not verified (only Docker is available) | M | L | Portable Compose rules; verify on a Podman machine before R1.0 | — | LC |
| R-09 | Toolchain churn: Node 24 → 26 (26 is LTS from 2026-10-28), TypeScript 7 vs typescript-eslint, Vitest/Vite majors | H | L | Pins (ADR-0012), grouped Dependabot, majors one at a time with a full L4 run | A Dependabot major PR | O |
| R-10 | AI agent cost and context exhaustion | M | M | Short always-loaded files, on-demand docs, ≤ 2 parallel agents, handoff at 70 % | Sessions per task rising | O |
| R-11 | Subagent claims not matching reality ("tests pass") | M | H | Orchestrator reruns the checks; claim-accuracy metric at gates | Any discrepancy | O |
| R-12 | Vietnamese text: diacritics search, rendering, long strings | M | M | `unaccent` search, Inter font, no all-caps, QA in both languages | — | O |
| R-13 | Time zones and deadlines (students abroad, DST) | L | M | UTC storage, browser-tz display, server-side deadline checks, FakeTimeProvider tests | — | O |
| R-14 | Public repository exposes personal data | L | H | Invented fixtures, gitleaks + push protection, no real screenshots | — | O, LC |
| R-15 | Single point of failure: the tutor loses the password or the server dies | M | H | Reset CLI, backup and restore runbook + drill before R1.0 | — | LC |
| R-16 | Flaky E2E tests consuming time | M | M | Seeded state through the API, Playwright auto-waits, `clock`, quarantine with a tracking note | A rerun passes without a change | O |
| R-17 | Rich text editor complexity (Tiptap) | M | M | OD-05 spike with a time box; fallback to Markdown | Spike > 1 day | O |
| R-18 | Python installed by the owner isn't on the PATH of existing sessions | L | L | The project doesn't need Python; restart the terminal or session if a tool ever does | — | LC |
