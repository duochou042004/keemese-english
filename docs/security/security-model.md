# Security Model

Threats and tests: [threat-model.md](threat-model.md). Auth decision: [ADR-0004](../decisions/0004-cookie-auth-same-origin.md).

## Principals and policies

| Policy | Requirement | Used by |
|---|---|---|
| *(fallback)* | Authenticated, active, password change not pending | Every endpoint not listed below |
| `Tutor` | `role = tutor` | All non-`/api/me`, non-`/api/auth` endpoints |
| `Student` | `role = student` | `/api/me/**` |
| `Anonymous` (explicit) | — | `POST /api/auth/login`, `/health/*`, SPA static files |
| `PasswordChangePending` | Only `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/logout`; every other `/api` request → 403 `auth.password_change_required` | Users with `mustChangePassword`. Enforced by the `PasswordChangeGate` middleware after authorization (endpoints opt in with `AllowDuringPasswordChange()`), not by a policy. SPA pages still load |

The role claim comes from the database at sign-in, and the security stamp is revalidated on every request (ADR-0004). Archiving a student or resetting a password therefore takes effect on the session's next request.

## Authentication

- Username + password (Identity, PBKDF2 hashing with the framework's default iteration count).
- Password policy: **≥ 10 characters**, no composition rules (NIST SP 800-63B), checked against a small embedded list of common passwords (`Modules/Identity/Domain/common-passwords.txt`: 10,000 entries of ≥ 10 characters from SecLists, compared case-insensitively), at most 256 characters. `PasswordPolicy` is Identity's only password validator, so create, change and reset share it. Temporary passwords are 12 random characters from an unambiguous alphabet.
- Lockout: 5 failures → 15 minutes. Login is rate limited to 5 per minute per IP and 20 per hour per username. Requests rejected by the rate limiter don't count toward lockout: the login service asks the limiter (`System.Threading.RateLimiting`, partitioned by the forwarded client IP and the normalized username) before the password check. The limits are in memory, per app instance, and a restart clears them. IPv6 clients are partitioned per /64. A locked-out login still runs one dummy hash, so its timing matches a wrong password. The lockout writes an `auth.locked_out` audit event.
- Accepted risks (T-103 security review, 2026-10-24): (1) one IP that knows a username can keep it locked out by spending ~20 failures an hour, which also exhausts that username's 20/h budget; the operator CLI clears the lockout but not the in-memory limit (restart the app). (2) A wrong password does one more database write (the failure count) than an unknown or locked-out user, a few ms on top of PBKDF2; the rate limits make this hard to use. (3) `change-password` does not limit wrong current passwords; it needs a valid session and antiforgery token. The tutor can unlock a student, and the operator CLI (`--reset-tutor-password`) also clears the tutor's lockout (threat T19).
- The same error and similar timing for "no such user" and "wrong password".
- Session cookie per ADR-0004. Logout clears the cookie and rotates the antiforgery token.
- **Nothing credential-like in `localStorage` or `sessionStorage`.** Only the UI language before login (`lang`) and UI conveniences (collapsed sidebar).

### Tutor bootstrap
On startup, if no tutor exists **and** `BOOTSTRAP_TUTOR_USERNAME` + `BOOTSTRAP_TUTOR_PASSWORD` are set, create the tutor with `must_change_password = true` and log `tutor bootstrap: created` (without the values). If a tutor exists, ignore the variables and log a warning recommending their removal. There is no HTTP endpoint for this.

## Authorization and student isolation

**Rule 1: the student ID comes from the principal, never from input.** `/api/me/**` handlers get `StudentId` from `ICurrentUser`. Route parameters there identify only *the student's own* sub-resources (attempt, task, session), and every query is constrained by `student_id = currentStudent`. A miss → 404.

**Rule 2: tutor routes validate relationships.** Example: `PUT /api/attempts/{id}/grade` loads the attempt through its student activity, and `POST /api/sessions/{id}/wrap-up` checks that the homework activities exist and are not archived. Cross-student mix-ups (attaching A's student activity to B's session) are rejected with 400.

**Rule 3: audience-specific DTOs** ([backend conventions](../backend/conventions.md#rules) rule 5).

**Rule 4: tests.** Every `/api/me` endpoint is in the isolation suite: student A's IDs used by student B → 404, and no private fields in A's own responses ([testing strategy](../testing/strategy.md#isolation-suite)).

### Authorization matrix (summary)

| Resource | Tutor | Student (own) | Student (other's) |
|---|---|---|---|
| Student list, profile, learning profile | CRUD | own name and language via `/auth/me` | 404 |
| Goals, metrics, readings | CRUD | read | 404 |
| Private notes, prep notes | CRUD | — | — |
| Sessions | CRUD | read (redacted) | 404 |
| Plan | CRUD | read | 404 |
| Library (content, questions, activities, lessons) | CRUD | granted content items only (read) | 404 |
| Student activities, attempts, answers | read, grade, cancel | read, start, answer, submit | 404 |
| Files | all | see [file access](#file-access) | 404 |

## File access

`GET /api/files/{id}` serves the file if:
- the caller is the tutor, **or**
- the caller is a student **and** one of the following is true:
  1. A `content_grants` row exists for (student, content item with `file_id = id`).
  2. The file is in `question_files` for a question present in one of the student's **own** non-cancelled student-activity snapshots (`snapshot.sections[].items[].fileIds`).
  3. The file is attached to one of the student's own answers.
  4. The student uploaded it (`stored_files.uploaded_by`).

Otherwise → 404, and the denial is logged as an `audit_events` entry (rate-limited).

Upload rules:
- Allowlist by extension **and** sniffed magic bytes: pdf, docx, pptx, xlsx, png, jpg, webp, gif, mp3, m4a, wav, ogg, webm, mp4, txt.
- SVG and HTML are **rejected** because they can carry scripts.
- Size limits come from configuration (OD-03), enforced by Kestrel's request limit **and** by a stream length check.
- The stored name is server-generated. `original_name` is sanitized for display.

Response headers:
- `Content-Type` = the sniffed type.
- `X-Content-Type-Options: nosniff`.
- `Content-Disposition: attachment` except for pdf, image, audio and video, which are served `inline`.
- `Content-Security-Policy: default-src 'none'; sandbox` on file responses.
- `Cache-Control: private, max-age=0` so a shared computer's cache doesn't keep a student's material after logout.

## Web security headers (app)

- `Content-Security-Policy`: `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`. The `frame-src` hosts are the embed allowlist (FR-CONT-02 embeds). Changing it requires a security review.
- `Strict-Transport-Security` (production), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=()` (the microphone opens up when audio recording arrives in Phase 2). `Cache-Control: private, no-store` on `/api/**` responses (T18). Implemented in `Infrastructure/Security/SecurityHeaders.cs`; `PipelineTests` holds a copy of the CSP string and fails if they drift.
- Embeds: only allowlisted providers, converted on the server from a URL to a canonical embed URL. Arbitrary iframe HTML is never accepted.
- Links: `meeting_url` and link items must be `https:`. They render with `rel="noopener noreferrer"`.

## Secrets and configuration

- Secrets come only from environment variables or the host's secret store: the DB password, `BOOTSTRAP_TUTOR_PASSWORD`, and the audit IP salt (`Security__IpHashSalt`).
- `.env` is git-ignored. `.env.example` holds placeholders such as `change-me`. Development uses `dotnet user-secrets` or `.env`.
- CI uses no secrets for build and test (the test DB is an ephemeral container). A public repo means fork PRs get no secrets, which is fine.
- **Secret scanning:** enable GitHub secret scanning and push protection on the public repository (free for public repos), and run `gitleaks` in CI on PRs.

## Privacy

- Data collected is limited to the spec's lists (§4.2, §5.6, §8). No analytics, trackers, external fonts or CDNs (NFR-PRIV-01).
- Permanent student deletion removes their rows and files (FR-STU-06). Backups age out under the backup rotation ([runbooks](../operations/runbooks.md#backup)).
- **Public repository:** fixtures, seed data, screenshots and E2E data use **invented** people only. Never commit exports from a real deployment.
- Logs contain IDs, not names or content.
