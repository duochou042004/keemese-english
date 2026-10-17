# ADR-0013: Testing stack

Status: Accepted (2026-10-17)

## Decision (versions current on 2026-10-17)
| Layer | Tool |
|---|---|
| Backend unit | xUnit v3 (`xunit.v3`) in `tests/Keemese.UnitTests`. No Docker |
| Backend integration and API | xUnit v3 + `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory`) + **Testcontainers.PostgreSql** (real PG 18), with one container per test assembly and a cleanup step between tests |
| Frontend unit and component | **Vitest 5** + Testing Library + jsdom. **MSW** for HTTP mocking in component tests |
| E2E | **Playwright** (Chromium in PRs; Firefox and WebKit in release and compat runs) against the real API and database through Compose |
| Accessibility | `@axe-core/playwright` on every E2E page visit (fail on serious or critical) |
| Visual | Playwright screenshots at 1440, 1024, 768 and 390 px, captured as **review evidence**. **No pixel-diff baselines in MVP** |

## Why there are no pixel baselines
Screenshot baselines differ across operating systems and fonts, and they churn on every intentional change. That conflicts with NFR-PORT-01 and the GitHub Free budget. Instead, screenshots are reviewed at milestone gates against the [visual QA checklist](../testing/strategy.md#visual-qa). Revisit after release 1.0, when the UI is stable (Linux-only baselines could be added then).

## Alternatives
- NUnit or MSTest: no advantage.
- The EF in-memory provider or SQLite for integration tests: behaves differently from PostgreSQL (jsonb, arrays, unaccent, constraints). Rejected.
- Cypress: Playwright covers more browsers and runs in parallel for free.
