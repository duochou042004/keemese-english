# CI/CD Design (GitHub Actions, GitHub Free, public repository)

Facts checked 2026-10-17 (re-check yearly):
- Standard GitHub-hosted runners are **free for public repositories**.
- Free-plan limits: **500 MB artifact storage** and **10 GB cache per repository**.
- Artifacts are **retained 90 days by default** unless `retention-days` is set.
- Windows and macOS runners cost more where billing applies.
- Action versions used (latest releases re-checked 2026-10-23: checkout v7.0.1, setup-dotnet v6.0.0, setup-node v7.1.0, upload-artifact v7.0.2, gitleaks-action v3.0.0): `actions/checkout@v7`, `actions/setup-dotnet@v6`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/cache@v6`.

Even though the minutes are free, we keep CI lean. Fast feedback and the artifact quota matter, and the repo might become private later.

## Workflows (created in M0 task T-003)

### `ci.yml` — every PR to `develop` or `master`, and pushes to `develop` and `master`
```yaml
on:
  pull_request: { branches: [develop, master] }
  push: { branches: [develop, master] }
permissions: { contents: read }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
```
| Job | Runs when (a `git diff` step against the PR base; no third-party filter action) | Steps |
|---|---|---|
| `changes` | always | Compute `backend`, `web`, `docs` flags (all `true` on push). A change to `ci.yml` sets all three |
| `backend` | `backend` changed or push | setup-dotnet (from `global.json`, NuGet cache keyed on `**/packages.lock.json`) → `dotnet restore --locked-mode` → `dotnet build -warnaserror` → unit tests → integration tests (Testcontainers on the ubuntu runner's Docker) → `dotnet list package --vulnerable --include-transitive` (fails the job on any hit) |
| `web` | `web` changed or push | setup-node (`.nvmrc`, `cache: npm`) → `npm ci` → lint → typecheck → Vitest → build → `npm audit --omit=dev --audit-level=high` → guard-hook tests (`node --test ".claude/hooks/*.test.mjs"`). **API types are up to date** (regenerate from the built API's OpenAPI document and `git diff --exit-code`) is added with the first generated client in M1 |
| `e2e-smoke` (M1, with the first E2E test) | `backend` or `web` changed | Compose up (db + app image built in the job) → Playwright **Chromium**, scenarios selected per the [mapping](../frontend/ux-journeys.md#journey--e2e-mapping) (`@smoke` tag + tags for the changed areas) |
| `secrets` | always | `gitleaks/gitleaks-action` (pinned to a commit SHA; no license needed for a personal-account repo), full history; PR comments and the SARIF artifact are off so `contents: read` is enough and no leaked value is re-published |
| `docs` | `docs` changed (`*.md`, `progress.json`, `scripts/`) | `scripts/check-docs.mjs` (internal links and anchors; external links are not checked) → `scripts/check-progress.mjs` (progress.json shape the hooks and handoff rely on) → their `node --test` tests. No third-party link checker |

Artifacts: on **failure only**: the Playwright report and traces (`retention-days: 5`), and the `TestResults/*.trx` files (`retention-days: 5`). Never `bin/`, `obj/`, `node_modules/` or full builds. Successful runs upload nothing.

### `e2e-full.yml` — release gate
`workflow_dispatch` + `pull_request` to `master`. Full Playwright suite on Chromium, Firefox and WebKit (matrix). Failure artifacts kept 5 days.

### `compat.yml` — cross-platform check
`schedule: weekly (Mon 02:00 UTC)` + `workflow_dispatch` + PR label `compat`. Matrix: `windows-latest`, `macos-latest` running **backend build + unit tests** and **web lint, typecheck, Vitest and build**. Integration tests and E2E run on Linux only (hosted macOS runners have no Docker; Windows runners can't run Linux containers). This is documented, not hidden. It catches path, casing and line-ending bugs.

### `dependabot.yml`
Weekly. Ecosystems: `nuget`, `npm` (`/web`), `github-actions`, `docker` (`/deploy`). Minor and patch updates grouped per ecosystem; majors in separate PRs. ESLint majors are ignored until `eslint-plugin-jsx-a11y` supports ESLint 10. `deploy/Dockerfile` base images are pinned by digest, so the docker ecosystem proposes digest bumps too.

## Caching policy
- NuGet: the setup-dotnet cache keyed on the lockfile hash. npm: the setup-node `cache: npm` keyed on `package-lock.json`.
- Playwright browsers: cached by Playwright version (`~/.cache/ms-playwright`) **only** in E2E jobs.
- No caches keyed on run IDs or dates (they churn). With these keys the total stays well under 10 GB.

## Security of the workflows
- `permissions: contents: read` at the top level. Jobs that need more ask for exactly that.
- No `pull_request_target`. Fork PRs run without secrets, and none are needed.
- First-party `actions/*` are pinned to a major version (updated by Dependabot). Checkouts use `persist-credentials: false`. **Third-party actions are pinned to a full commit SHA** with a version comment.
- Branch protection (once on GitHub): `develop` and `master` require a PR and the `ci` checks, with **0 required approvals** (GitHub does not let an author approve their own PR, and the owner is the only maintainer). No force-push or deletion. Agents open PRs; the Lead Coordinator records approval (review or comment) and performs the merge.

## Release procedure
1. On `develop`, every milestone gate in [strategy.md](strategy.md#quality-gates) is green, and `progress.json` and the release notes are updated (`docs/delivery/releases.md`, created at the first release).
2. PR `develop → master`. The `e2e-full` and `compat` (manually dispatched) workflows run green.
3. After approval: merge (merge commit, no squash, so `develop` history stays reachable), tag `vX.Y.Z` on `master`, and push the tag.
4. Build the image from the tag. Publishing it (for example to GHCR) is decided with OD-06.
5. Record the evidence (run URLs, test summaries) in `docs/delivery/evidence/release-vX.Y.Z.md`, because artifacts expire after 5 days.
