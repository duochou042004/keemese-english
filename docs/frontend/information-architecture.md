# Frontend Information Architecture

Spec §41 proposes a menu "to be adjusted after UX research" and says "menu must reflect user tasks, not entities". The adjustments below are **PD-08** (needs review).

## Tutor navigation (7 items)

| Item | Answers (§55) | Contains |
|---|---|---|
| **Today** (home) | Who am I teaching today? What is pending? | Today's sessions (Join, Wrap up), review queue preview, needs attention, upcoming, quick actions |
| **Students** | What does this student need? How are they progressing? | List → **student workspace** (tabs below) |
| **Calendar** | When are my lessons? | Week and agenda views, schedule session |
| **Review** | What homework is pending? What result did they get? | Submitted attempts across students, oldest first; grading screen |
| **Activities** | — | Assignments and Assessments (one list, kind filter), builder, assign |
| **Question bank** | — | Questions list, editor |
| **Library** | Where is the material? | Content (folders and items) and Lessons (reusable lesson plans) as two tabs |

Account menu (avatar, top right): Settings (language, password), Log out.

Why it differs from §41:
- **Learning Plans** and **Progress** are per student, so they are workspace tabs. A global Learning Plans page would only list students again. If templates arrive (Phase 2), they get a Library tab.
- **Assignments and Assessments** share one area because they share one engine (ADR-0010). A kind filter replaces two menus.
- **Review** is added because "Pending submissions" is a daily task (§27, §55), not an entity.

### Student workspace tabs

`Overview · Plan · Sessions · Work · Materials · Notes · Profile`

- **Overview** (default): next session, open and overdue tasks, latest results, goals with progress, pinned notes. Quick actions: Schedule, Assign, Add note, Record reading.
- **Plan**: phases and items (editor). Empty state: "Create a plan" (template comes later).
- **Sessions**: history and upcoming. Wrap-up entry point.
- **Work**: this student's student activities, grouped To do / Submitted / Graded. "Assign activity".
- **Materials**: granted content and its sources. "Share material".
- **Notes**: private notes timeline. A visible "Only you can see this" marker.
- **Profile**: personal, contact, parents, learning profile, goals and metrics, account (reset password, archive, delete).

Progress is not a separate tab: progress figures sit at the top of Overview, and goals and metrics are edited in Profile → Goals. *Revisit after M7 usability check.*

## Student navigation (5 items)

`Home · Tasks · Lessons · Materials · Progress`
- **Home**: FR-DASH-02.
- **Tasks**: to do / overdue / submitted / graded, then the task detail and the attempt-taking screen.
- **Lessons**: upcoming (with Join) and past (summary, materials, homework).
- **Materials**: granted content, search.
- **Progress**: "My plan" (read-only) at the top, then goals, results history and metric charts.

Account (avatar): Language, Change password, Log out.

## Routes

TanStack Router, file-based (ADR-0006). `/t/*` = tutor, `/s/*` = student. Each area is lazy-loaded behind a role guard. Search params are validated with Zod.

| Route | Search params | Screen |
|---|---|---|
| `/login` | `redirect?` | Login |
| `/change-password` | — | Forced or voluntary password change |
| `/` | — | Redirect by role |
| `/t` | `date?` | Today |
| `/t/students` | `q?, status?` | Student list |
| `/t/students/new` | — | Add student (J2) |
| `/t/students/$studentId` | — | Workspace → Overview |
| `/t/students/$studentId/{plan,sessions,work,materials,notes,profile}` | per tab | Workspace tabs |
| `/t/calendar` | `view=week\|agenda, date` | Calendar |
| `/t/sessions/$sessionId` | `wrap=1?` | Session detail; `wrap=1` opens the wrap-up panel (J1) |
| `/t/review` | `studentId?, kind?` | Review queue |
| `/t/review/$attemptId` | — | Grading (J4) |
| `/t/activities` | `kind?, q?, tag?, archived?` | Activities |
| `/t/activities/new` | `kind` | Builder (J3) |
| `/t/activities/$activityId` | `assign=1?` | Builder; `assign=1` opens the assign dialog |
| `/t/questions` | `q?, type?, tag?, difficulty?, archived?` | Question bank |
| `/t/questions/new`, `/t/questions/$questionId` | — | Question editor |
| `/t/library` | `folder?, q?, kind?, tag?` | Content |
| `/t/library/items/$itemId` | — | Content item |
| `/t/library/lessons`, `/t/library/lessons/$lessonId` | `q?` | Lesson plans |
| `/t/settings` | — | Settings |
| `/s` | — | Home |
| `/s/tasks` | `status?` | Tasks |
| `/s/tasks/$taskId` | — | Task detail (instructions, attempts, results) |
| `/s/attempts/$attemptId` | `item?` | Taking an attempt |
| `/s/lessons`, `/s/lessons/$sessionId` | `when=upcoming\|past` | Lessons |
| `/s/materials`, `/s/materials/$itemId` | `q?` | Materials |
| `/s/progress` | — | Plan + progress |
| `/s/account` | — | Language, password |

**Deep links** (for example a Zalo message with a task link) work after login through `?redirect=`. Redirects are validated to stay same-origin and inside the user's role area.

## Layout shells

| Width | Tutor | Student |
|---|---|---|
| ≥ 1280 (desktop) | Left sidebar 240 px with labels; content max width 1200 px | Left sidebar 220 px |
| 768–1279 (tablet) | Collapsible icon rail (64 px) + tooltip labels | Icon rail |
| < 768 (phone) | Top bar (title + account) + **menu drawer**; primary page action as a sticky bottom button | **Bottom tab bar** (5 items, labels always visible) |

Workspace tabs on phone: horizontally scrollable tab list with the current tab scrolled into view, never wrapped onto two lines.

## Data fetching

- TanStack Query keys: `['students', params]`, `['student', id]`, `['student', id, 'overview']`, … A mutation invalidates the narrowest affected keys.
- Route loaders prefetch with `ensureQueryData`, so pages don't show loading spinners on navigation when the data is cached.
- `staleTime` 30 s by default. Dashboards refetch on window focus.
- The `fetch` wrapper adds `X-XSRF-TOKEN`, sends `credentials: 'same-origin'`, maps ProblemDetails `code` → i18n message, and on 401 clears the cache and goes to `/login?redirect=`.
