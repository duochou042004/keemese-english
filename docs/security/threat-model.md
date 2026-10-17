# Threat Model

Method: assets → actors → threats grouped by STRIDE category → mitigations → tests. Review it at every milestone gate and whenever auth, files, embeds or deployment change.

## Assets (by sensitivity)

1. **Student personal data**: names, contacts, parent contacts.
2. **Private tutor data**: notes, prep notes, learning profiles.
3. **Assessment integrity**: answer keys before release, scores, feedback.
4. **Student work**: answers and uploaded files (voice recordings in audio files are personal data).
5. **Tutor-created content**: the library. Commercially valuable to the tutor.
6. **Credentials and sessions.**

## Actors

| Actor | Capability | Motivation |
|---|---|---|
| Curious or cheating student | Valid student session, browser devtools | See answers early, see other students' grades, change their own score |
| Ex-student | An old password or session | Keep accessing material |
| Internet attacker | Anonymous HTTP | Credential stuffing, generic exploits, scraping |
| Malicious file | Uploaded by a student or embedded in content | XSS, malware distribution |
| Lost or shared device | The browser of a logged-in user | Session reuse |
| Supply chain | npm or NuGet dependency, GitHub Action | Code execution in CI or the app |

## Threats and mitigations

| # | STRIDE | Threat | Mitigation | Test / evidence |
|---|---|---|---|---|
| T1 | Spoofing | Credential stuffing or brute force on login | Lockout 5/15 min, rate limits, ≥ 10-char passwords + common-password check, generic errors | Integration test: lockout after 5 attempts; rate limit returns 429 |
| T2 | Spoofing | Session theft via XSS | HttpOnly cookie, strict CSP, no `dangerouslySetInnerHTML` except the sanitized rich text renderer | Lint rule banning `dangerouslySetInnerHTML` outside `RichText.tsx`; CSP header test |
| T3 | Tampering | CSRF on state-changing endpoints | SameSite=Lax + antiforgery header on unsafe methods | Integration test: POST without the token → 400 |
| T4 | Info disclosure | **IDOR**: student B reads A's task, attempt, session or file by ID | Student ID from the principal; scoped queries; 404 on a miss | **Isolation suite** over every `/api/me/**` and `/api/files/{id}` route |
| T5 | Info disclosure | Answer keys or explanations sent to a student before release | One redaction function; separate DTOs | API tests for key absence before release and presence after |
| T6 | Info disclosure | Private notes or prep notes leak through a student DTO | No such properties on student DTOs; notes endpoints are tutor-only | Reflection test: student DTO property names ∌ {note, prep, correct, accept, explanation}; plus the isolation suite text check |
| T7 | Tampering | Student submits after the time limit or changes a submitted answer | Server-side deadline and grace, status checks, lazy auto-submit | Tests with `FakeTimeProvider` |
| T8 | Elevation | Student calls tutor endpoints | Tutor policy on all non-`/me` groups; fallback policy | Test: enumerate every endpoint from `EndpointDataSource` and assert each has an explicit policy or anonymous marker, then call every tutor route as a student and expect 403 |
| T9 | Elevation | A second tutor appears (bug or SQL) | Partial unique index on role; no endpoint creates a tutor | DB constraint test |
| T10 | Tampering / XSS | Malicious rich text, link or embed | JSON whitelist for rich text; https-only links; embed provider allowlist; CSP | Unit tests for the sanitizer; E2E check that a payload doesn't execute |
| T11 | Tampering / XSS | Uploaded HTML or SVG executes in the app origin | Rejected by the allowlist; `nosniff`; `sandbox` CSP on file responses; attachment disposition | Upload test cases (svg, html renamed to .png) |
| T12 | DoS | Huge uploads or many requests | Size limits at Kestrel and the stream, rate limiting on uploads and login, pagination caps | Integration test: oversize → 413 |
| T13 | Info disclosure | Path traversal via file names | Server-generated storage keys; names never used in paths | Unit test for `LocalFileStorage` |
| T14 | Repudiation | Disputed grade or account changes | `audit_events` for logins, resets, deletes and grade releases (who and when) | Test that events are written |
| T15 | Info disclosure | Data in a public Git repository | Gitignored `.env`; gitleaks + GitHub push protection; invented fixtures | CI secret scan |
| T16 | Supply chain | Compromised dependency or Action | Lockfiles, `npm ci`, Dependabot, minimal dependencies (ADR-0014), `permissions: contents: read`, first-party actions pinned to major versions and third-party actions pinned to commit SHA | CI config review |
| T17 | Info disclosure | Ex-student keeps access | Archive deactivates the account immediately (security stamp); old cookies fail on the next validation | Integration test |
| T18 | Info disclosure | Shared device | Default session cookie (not persistent) unless "remember me"; `Cache-Control: private` on API and file responses; logout clears query cache in the SPA | E2E check: logout, then back → login page |

## Out of scope (accepted risks)

- Malware scanning of uploads (single trusted tutor, files are students' own). Revisit if the tutor shares files widely. Mitigated by attachment disposition.
- A compromised tutor account means full compromise. Mitigations are a strong password and optional 2FA in the future (Identity supports TOTP; this is a product decision).
- Host-level security (OS patching, TLS termination) is the deployer's responsibility, covered by [deployment](../operations/deployment.md).

## Security testing summary

| Gate | Checks |
|---|---|
| Every PR touching `src/` | Isolation suite + authz enumeration test (part of the integration tests) |
| Every PR | `gitleaks`, `dotnet list package --vulnerable`, `npm audit --audit-level=high` (fails only on high or critical in runtime dependencies) |
| Milestone gate | `security-reviewer` subagent pass over the auth, files and DTO diffs since the last gate, using this table |
| Release 1.0 | Manual pass with OWASP ASVS Level 1 as the checklist, recorded in `docs/delivery/evidence/` |
