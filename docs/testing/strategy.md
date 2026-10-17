# Testing Strategy

Tools: [ADR-0013](../decisions/0013-testing-stack.md). CI wiring: [ci.md](ci.md).
Principle: **depth is proportional to risk.** Run the narrowest check that proves the change, widen it when the change touches shared behavior, and always record what was and was not run.

## Layers

| Layer | Location | What belongs here | Speed |
|---|---|---|---|
| Backend unit | `tests/Keemese.UnitTests` | Grading per question type, normalization, progress math, state transitions, validation rules, redaction, architecture test, DTO reflection test | < 10 s total |
| Backend integration and API | `tests/Keemese.IntegrationTests` | Endpoint behavior with real PostgreSQL: authn/authz, **isolation suite**, migrations, constraints, concurrency, file upload/download, wrap-up transaction | 1–3 min |
| Frontend unit and component | `web/src/**/*.test.ts(x)` | Components with Testing Library + MSW: forms (validation, error codes → messages), state components, hooks, i18n parity | < 30 s |
| E2E | `web/e2e/*.spec.ts` | Journeys from [ux-journeys.md](../frontend/ux-journeys.md#journey--e2e-mapping) against the real stack, plus axe | 2–6 min |
| Visual QA | Playwright screenshot script + human/agent review | Layout at 4 widths × 2 languages ([checklist](../frontend/design-system.md#visual-qa-checklist-per-screen-at-every-ui-pr-touching-it)) <a id="visual-qa"></a> | on demand |

Not used: snapshot tests of component markup (brittle, low signal), EF in-memory tests, mocks of `AppDbContext`.

## Risk ladder (choose the level per change)

| Level | Change examples | Required checks |
|---|---|---|
| **L1 — local** | Copy text, a style tweak in one leaf component, docs | Inspect the diff. Run the narrowest check: `npm run typecheck` + the affected component test, or a single route screenshot at 390 and 1440 px. Docs only: link check |
| **L2 — module** | A new endpoint, a service rule, a new form, a migration adding a column | L1 + the module's unit and integration tests (`--filter`) + affected component tests + an API contract regeneration check |
| **L3 — critical workflow** | Anything on J1–J5, grading, attempts, wrap-up, assign | L2 + the mapped E2E scenarios + regression paths that share the code |
| **L4 — cross-cutting / sensitive** | Auth, authz policies, `/api/me` handlers, file access, redaction, DTOs, shared layout or AppShell, routing, query client, migrations that change or drop data, dependency majors, release | **Full** backend tests + full frontend unit tests + full E2E suite (Chromium; plus Firefox and WebKit at release) + isolation suite + security checks + visual QA on affected screens |

**Do not under-classify.** A "one-line" change in `AppShell`, `fetch` wrapper, `Policies`, `CurrentUser`, a redaction helper or a shared form component is **L4**, whatever its size.

### Test selection rules (path → minimum level)

| Changed path | Minimum level |
|---|---|
| `docs/**`, `*.md` | L1 (links) |
| `web/src/locales/**` | L1 + i18n parity test |
| `web/src/components/ui/**`, `AppShell`, `web/src/api/**`, `web/src/routes/__root*`, router or query setup | **L4** |
| `web/src/features/<area>/**` | L2 (that area) → L3 if the area is on a journey |
| `src/Keemese.Api/Infrastructure/Security/**`, `Modules/Identity/**`, any `*/Student*Dto*`, redaction | **L4** |
| `src/Keemese.Api/Modules/<M>/**` | L2 for `<M>` → L3 if `<M>` is Activities or Lessons |
| `Infrastructure/Data/Migrations/**` | L2 + migration-from-empty in CI → L4 if it changes or drops data |
| `.github/workflows/**`, `deploy/**`, `global.json`, `.nvmrc`, `package.json` dependency versions | L4 (CI must run end to end; compat workflow on demand) |

<a id="isolation-suite"></a>

## Isolation suite (NFR-SEC-01 / T4–T6)
One parameterized integration test class that **discovers** every endpoint under `/api/me/**` and `/api/files/{id}`, so new endpoints can't skip it:
1. Seed students A and B, each with sessions, tasks, attempts, materials, notes and files.
2. For each A-owned resource ID in each route template: call as B → expect **404**.
3. Call every `/api/me` GET as A → assert the response doesn't contain A's private note text, prep note text, `correct`/`accept`/`explanation` keys (before release), or any of B's IDs.
4. Call every tutor endpoint as a student → **403**. Call everything except the anonymous allowlist without a cookie → **401**.

A route the discovery can't fill (a new parameter name) **fails the test**, so the author has to add a fixture mapping.

## Fixtures and data

- Builders in test projects (`Given.Student("Nguyễn Minh Anh")...`). No shared mutable seed files.
- E2E seeds through the real API (`e2e/fixtures/seed.ts`) using an E2E-only bootstrap tutor from environment variables. The database is reset per run (fresh Compose volume in CI; `npm run e2e:reset` locally).
- **Invented data only** (public repository).
- Time-dependent logic uses `FakeTimeProvider` on the backend and Playwright `clock` in E2E.

## Failure handling

1. Read the failure output first. Don't rerun blindly.
2. Reproduce the **single** failing test locally (`--filter` / `-g`).
3. Fix, then rerun the failing test plus its regression set (same class or spec file + the tests covering the shared code you touched).
4. Widen to the full level only if the fix touched shared behavior, the root cause is unclear, or the failure was flaky. A flaky test is quarantined only with a tracking note in `progress.json` → `risks`, never silently.
5. Record it in the evidence log: the failing test, the cause, the fix, and the reruns.

## Long-running commands (agents and humans)

- Run integration tests, E2E and Compose builds **in the background** with the harness's background mechanism. Wait for the completion notification instead of polling. Never start a duplicate run while one is in flight.
- Report success only from the actual exit code and the summary line ("Passed: 214, Failed: 0").

## Evidence format

Every task records evidence in `progress.json` (`evidence[]`), and at milestone gates also in `docs/delivery/evidence/<milestone>.md`:

```json
{ "date": "2026-10-20", "task": "T-001", "level": "L2",
  "commands": ["dotnet test tests/Keemese.UnitTests"],
  "result": "pass", "summary": "Passed 18, Failed 0, Skipped 0",
  "not_run": ["E2E (no UI yet)"], "commit": "abc1234" }
```

Never write `pass` for a command that wasn't run, or whose result wasn't seen.

## Quality gates

| Gate | Must pass |
|---|---|
| **PR → `develop`** | CI (build, lint, typecheck, unit, integration incl. isolation suite, secret scan, dependency audit, API types up to date) + the checks for the change's ladder level + docs and `progress.json` updated + reviewer subagent verdict for L3/L4 + **Lead Coordinator approval** |
| **Milestone gate** | All of the above + every E2E scenario mapped to the milestone + visual QA on new screens at 4 widths × 2 languages + `security-reviewer` pass + an evidence file |
| **Release (`develop` → `master`)** | Full E2E on Chromium, Firefox and WebKit + compat workflow (Windows, macOS) green + backup/restore drill (R1.0) + release notes + approval |
