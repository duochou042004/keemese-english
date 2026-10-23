# T-110: M1 milestone gate

- Milestone: M1 · Ladder level: L4 (gate) · Depends on: T-101…T-109 merged · Branch: `chore/m1-gate` · **Session budget: 1 session (≤ ~200k tokens of work); split if larger**
- Status: not_started

## Objective
Prove every M1 exit criterion on `develop` with recorded evidence, so the Lead Coordinator can close M1 and M2/M3 packets can be written.

## Requirements / acceptance criteria
Each row of the M1 exit criteria in docs/delivery/milestones.md has evidence (command + result, or a run URL):
- J2 ≤ 2 interactions (`E2E-J2`) · forced password change and lockout (integration tests + `E2E-AUTH`) · isolation suite + authorization enumeration test present and green · `E2E-AUTH`, `E2E-J2`, `E2E-ISO` green in CI (`e2e-smoke`) · AppShell for both roles at 4 widths × 2 languages · tutor-password reset CLI run against the container.
- The standard gate (docs/testing/strategy.md#quality-gates): full backend tests, full frontend tests, full E2E on Chromium, axe clean, visual QA of every new M1 screen against the checklist, `security-reviewer` pass over the whole M1 diff (`git diff <M0 close>...develop`), **gitleaks full-history scan** run locally (CI scans first-parent only).
- `docs/delivery/evidence/m1.md` written (commands, summaries, run URLs, screenshot index, `not_run`).
- Traceability (docs/product/traceability.md) marks the M1 requirements implemented, with test references.
- Fixes found here are small and go in this branch; anything larger becomes a `fix/*` packet and blocks the gate.
- `progress.json`: M1 closed only after the Lead Coordinator approves; next task = write the M2/M3 packets (M2 needs OD-08; M3 needs OD-03 and OD-05).

## Inputs (read these, nothing more)
- docs/delivery/milestones.md · docs/testing/strategy.md#quality-gates · docs/frontend/design-system.md (visual QA checklist)
- docs/security/threat-model.md · `progress.json` evidence for T-101…T-109

## File ownership
- create/modify: `docs/delivery/evidence/m1.md`, `docs/delivery/evidence/m1/**`, `docs/product/traceability.md`, `progress.json`, `docs/handoff/next-session.md`; small fixes anywhere with a note
- must not touch: anything for M2+

## Verification
```bash
dotnet build -warnaserror && dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests                                   # background
npm ci --prefix web && npm run lint --prefix web && npm run typecheck --prefix web && npm test --prefix web && npm run build --prefix web
npm run e2e --prefix web                                                      # background
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.24.3 git /repo --redact
```
Review: `reviewer` + `security-reviewer` (milestone gate). Closing M1 needs the Lead Coordinator.

## Status / notes
—
