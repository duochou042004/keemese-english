# T-003: CI workflow, Dependabot, secret scan

- Milestone: M0 · Ladder level: L4 (CI) · Depends on: T-001, T-002 merged; **the GitHub repository exists** (owner action, PD-10) · Branch: `feature/m0-ci`
- Status: done (PR #5, merged 2026-10-23 as bd78a4e)

## Objective
Every PR to `develop`/`master` is checked on Linux within GitHub Free limits, with weekly Windows and macOS compatibility runs. **M0 closes when CI is green on GitHub.**

## Requirements / acceptance criteria
- `.github/workflows/ci.yml` as designed in docs/testing/ci.md (`changes`, `backend`, `web`, `secrets` jobs; `e2e-smoke` is added in M1 when the first E2E test exists; `docs` link check).
- `permissions: contents: read` at the top level, `concurrency` cancel-in-progress, `actions/*` pinned to major versions (checkout@v7, setup-dotnet@v6, setup-node@v7, upload-artifact@v7), third-party actions pinned to a commit SHA with a version comment.
- Failure-only artifact uploads with `retention-days: 5`. No uploads on success.
- NuGet and npm caches keyed on the lockfiles.
- The guard-hook tests run in the `web` job (`node --test ".claude/hooks/*.test.mjs"`) or their own tiny job.
- `.github/workflows/compat.yml` (weekly + manual + `compat` label): Windows and macOS build + unit + web checks.
- `.github/dependabot.yml`: nuget, npm (`/web`), github-actions, docker (`/deploy`), weekly, grouped minor/patch.
- A `docs/testing/ci.md` update if anything differs from the design (it's the source of truth for CI).
- After the push (owner-approved): turn on branch protection for `master`/`develop` (require a PR + the `ci` checks, **0 required approvals** because GitHub does not allow approving your own PR and the owner is the only maintainer, no force-push or deletion; the Lead Coordinator approval is recorded as a PR comment or review before they merge), secret scanning and push protection. **These are settings changes in GitHub: the owner does them, or approves each one explicitly.**

## Inputs
- docs/testing/ci.md · docs/security/threat-model.md (T15, T16) · docs/decisions/0001

## File ownership
- create/modify: `.github/**`, `docs/testing/ci.md`, `progress.json`
- must not touch: `src/**`, `web/**` (except CI-needed script names in `web/package.json` after asking)

## Verification
- Open a PR `feature/m0-ci → develop`. Every required job is green. Link the run URL in the evidence (artifacts expire; the URL and summary are the evidence).
- Trigger `compat.yml` manually once: green, or failures recorded as R-07 issues with follow-up packets.
- Check that a deliberately failing test (temporary commit, then reverted) uploads exactly the TRX/Playwright artifacts with a 5-day retention.

## Status / notes
—
