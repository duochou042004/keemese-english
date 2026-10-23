# API Contract

Conventions are in [ADR-0016](../decisions/0016-minimal-apis-and-contracts.md). The generated OpenAPI document (`/openapi/v1.json`, development only) is authoritative once it exists. This file is the design catalog and must be updated with any endpoint change.

## Conventions

- Base path `/api`. JSON, camelCase. Timestamps are ISO-8601 UTC. IDs are UUID strings.
- **Two audiences, two route trees:**
  - `/api/auth/**`: anonymous login, plus `me` endpoints for any signed-in user.
  - `/api/me/**`: **Student policy**. The student is *always* taken from the cookie principal. **No student ID appears in these paths or bodies.**
  - Everything else: **Tutor policy**.
- Fallback authorization policy = authenticated. Anonymous endpoints are explicitly marked: `POST /api/auth/login`, `GET /health/*`.
- A student requesting another student's resource → **404**, not 403 (no enumeration).
- Lists: `?q=&page=1&pageSize=50` (max 200) → `{ items: [...], total }`. Small bounded lists (folders, sections, a plan) return arrays.
- Unsafe methods require the `X-XSRF-TOKEN` header (ADR-0004).
- Optimistic concurrency: editable resources return `version` (from `xmin`). PUT and PATCH send it back. A mismatch → `409 concurrency.conflict`.
- Errors: `ProblemDetails` + `code` (+ `errors` for validation). Examples: `auth.invalid_credentials`, `auth.unauthenticated` (401), `auth.forbidden` (403), `auth.antiforgery_failed` (400, missing or wrong `X-XSRF-TOKEN`), `auth.locked_out`, `auth.password_change_required`, `students.username_taken`, `files.too_large`, `files.type_not_allowed`, `attempts.time_expired`, `attempts.limit_reached`, `activities.not_available_yet`, `concurrency.conflict`, `common.not_found`.

## Auth and account (any signed-in user)

| Method | Path | Body → Response | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `{userName, password, rememberMe}` → 204 + cookies | Rate limited (5/min/IP + lockout). Issues the `XSRF-TOKEN` cookie |
| POST | `/api/auth/logout` | → 204 | |
| GET | `/api/auth/me` | → `{id, role, displayName, language, mustChangePassword}` | 401 when anonymous |
| POST | `/api/auth/change-password` | `{currentPassword, newPassword}` → 204 | Clears `mustChangePassword`. Rotates the security stamp (other sessions end) and re-issues the cookie |
| PUT | `/api/auth/preferences` | `{language}` → 204 | |

## Tutor endpoints

### Students (Students + Identity)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/students?q&status=active\|archived` | List with search (FR-STU-03) |
| POST | `/api/students` | Create `{fullName, userName, temporaryPassword?, email?, phone?, contactChannels?, parents?}`. If no password is given, the server generates one and returns `{id, temporaryPassword}` once |
| GET | `/api/students/{id}` | Profile + learning profile |
| PATCH | `/api/students/{id}` | Edit profile and learning profile fields |
| POST | `/api/students/{id}/archive` · `/restore` | Deactivate or reactivate (FR-AUTH-07) |
| POST | `/api/students/{id}/reset-password` | → `{temporaryPassword}` (FR-AUTH-06) |
| POST | `/api/students/{id}/unlock` | Clear the lockout (FR-AUTH-AC9) |
| DELETE | `/api/students/{id}` | Permanent delete. Body `{confirmName}` must match (FR-STU-06) |
| GET | `/api/students/{id}/overview` | Workspace header: next session, open tasks, goals summary, pinned notes |

### Goals, metrics, notes
| Method | Path |
|---|---|
| GET, POST | `/api/students/{id}/goals` |
| PATCH, DELETE | `/api/goals/{goalId}` |
| GET, POST | `/api/students/{id}/metrics` |
| PATCH, DELETE | `/api/metrics/{metricId}` |
| GET, POST | `/api/metrics/{metricId}/readings` |
| DELETE | `/api/metric-readings/{readingId}` |
| GET, POST | `/api/students/{id}/notes?sessionId&activityId` |
| PATCH, DELETE | `/api/notes/{noteId}` |

### Content and files
| Method | Path | Notes |
|---|---|---|
| GET, POST | `/api/folders` | GET returns the whole tree (small) |
| PATCH, DELETE | `/api/folders/{id}` | PATCH `{name?, parentId?}`. Cycle check. DELETE `?moveContentsTo=parent` |
| GET | `/api/content?q&folderId&kind&tag&archived` | |
| POST | `/api/content` | `{kind, title, folderId?, tags?, fileId?, body?, url?}` |
| GET, PATCH, DELETE | `/api/content/{id}` | DELETE: 409 `content.in_use` if referenced. Use archive instead |
| POST | `/api/content/{id}/archive` · `/restore` | |
| POST | `/api/files` | multipart, one file → `{id, originalName, contentType, sizeBytes}`. Tutor upload limits (OD-03) |
| GET | `/api/files/{id}?download=1` | **Both roles**, authorization per [file access](../security/security-model.md#file-access). Range requests supported |
| GET | `/api/students/{id}/materials` | Grants for that student, with their sources |
| POST | `/api/students/{id}/materials` | `{contentItemIds:[]}` → direct grants |
| DELETE | `/api/students/{id}/materials/{contentItemId}` | Removes only the **direct** grant |
| GET | `/api/tags?scope=content\|questions\|activities\|lessons&q` | Autocomplete |

### Question bank
| Method | Path |
|---|---|
| GET | `/api/questions?q&type&tag&difficulty&archived` |
| POST | `/api/questions` |
| GET, PUT, DELETE | `/api/questions/{id}` (DELETE → 409 if used) |
| POST | `/api/questions/{id}/duplicate` · `/archive` · `/restore` |

### Activities, grading, review
| Method | Path | Notes |
|---|---|---|
| GET | `/api/activities?kind&q&tag&archived` | |
| POST | `/api/activities` | Create with sections and items. Inline new questions are created in the bank |
| GET, PUT, DELETE | `/api/activities/{id}` | Full builder save (versioned). DELETE → 409 if assigned |
| POST | `/api/activities/{id}/duplicate` · `/archive` · `/restore` | |
| POST | `/api/activities/{id}/assign` | `{studentIds[], availableFrom?, dueAt?, metricId?, metricValue?: "percent"\|"score"}` → creates student activities and snapshots, and grants materials. `metricId` must belong to each listed student, so assigning to several students with a metric means one metric per student: the client sends one request per student, or omits the metric |
| GET | `/api/student-activities?studentId&status&activityId` | `status=submitted` is the review queue (FR-ACT-14) |
| GET | `/api/student-activities/{id}` | With attempts summary |
| PATCH | `/api/student-activities/{id}` | `{dueAt?, extraAttempts?}` |
| POST | `/api/student-activities/{id}/cancel` · `/restore` | |
| GET | `/api/attempts/{id}` | Tutor view: snapshot items + answers + auto scores |
| PUT | `/api/attempts/{id}/grade` | `{answers:[{itemKey, manualScore?, comment?}], feedbackComment?, rubric?, release: bool}` |

### Lessons and sessions
| Method | Path | Notes |
|---|---|---|
| GET, POST | `/api/lessons?q&tag&archived` | |
| GET, PUT, DELETE | `/api/lessons/{id}` | + `/archive`, `/restore` |
| GET | `/api/sessions?from&to&studentId&status` | Calendar (max range 62 days) |
| POST | `/api/sessions` | `{studentId, startsAt, durationMinutes, mode, meetingUrl?, location?, prepNotes?, lessonId?, title?}`. A `lessonId` copies the title and duration and links its materials |
| GET, PATCH, DELETE | `/api/sessions/{id}` | PATCH of `startsAt` sets `originalStartsAt` the first time |
| POST | `/api/sessions/{id}/wrap-up` | **One transaction** (FR-LES-05): `{status, attendanceNote?, summary?, privateNote?, contentItemIds?[], homework?: [{activityId, dueAt?}], quickTask?: {title, instructions, responseType: "text"\|"file", dueAt?}}` → updated session + created student activities |
| POST | `/api/sessions/{id}/duplicate` | `{startsAt}`. **Only if OD-01 is approved** |

### Learning plans
| Method | Path | Notes |
|---|---|---|
| GET | `/api/students/{id}/plan` | 404 if none |
| PUT | `/api/students/{id}/plan` | Create or update the plan header |
| DELETE | `/api/students/{id}/plan` | |
| POST | `/api/plans/{planId}/phases` | |
| PATCH, DELETE | `/api/phases/{phaseId}` | |
| POST | `/api/phases/{phaseId}/items` | |
| PATCH, DELETE | `/api/plan-items/{itemId}` | Linking content creates a `plan_item` grant |
| PUT | `/api/plans/{planId}/order` | `{phases:[{id, itemIds:[...]}]}`: full reorder and move in one call |

### Progress and dashboard
| Method | Path |
|---|---|
| GET | `/api/dashboard/today?date` |
| GET | `/api/students/{id}/progress` |

## Student endpoints (`/api/me/**`, Student policy)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/me/home` | Dashboard bundle (FR-DASH-02) |
| GET | `/api/me/sessions?from&to` | Own sessions: summary, materials, homework. **No prep notes** |
| GET | `/api/me/sessions/{id}` | |
| GET | `/api/me/plan` | Read-only. 404 if none |
| GET | `/api/me/goals` | Goals + metric series |
| GET | `/api/me/progress` | FR-PROG-02 |
| GET | `/api/me/materials?q` | Granted content only (deduplicated across sources) |
| GET | `/api/me/materials/{contentItemId}` | 404 unless granted |
| GET | `/api/me/tasks?status=todo\|overdue\|submitted\|graded` | |
| GET | `/api/me/tasks/{studentActivityId}` | Redacted snapshot overview |
| POST | `/api/me/tasks/{studentActivityId}/attempts` | Start → `{attemptId, deadlineAt}`. Checks availability, attempts left, and that no attempt is already open |
| GET | `/api/me/attempts/{attemptId}` | Redacted items + saved answers + `deadlineAt`. Scores, feedback and answer keys only after release ([redaction](../backend/activity-engine.md#redaction)) |
| PUT | `/api/me/attempts/{attemptId}/answers/{itemKey}` | Autosave `{response, fileIds?}`. 409 after submit, 422 `attempts.time_expired` after deadline + 30 s |
| POST | `/api/me/attempts/{attemptId}/submit` | Auto-grades. Releases immediately if the policy allows |
| POST | `/api/me/files` | Answer uploads (student limits, OD-03). Files are owned by the uploader |

## Example error

```json
{
  "type": "https://keemese.local/errors/students.username_taken",
  "title": "Validation failed",
  "status": 400,
  "code": "validation.failed",
  "errors": { "userName": ["students.username_taken"] },
  "traceId": "00-…"
}
```
