# Critical User Journeys

These come from the real workflows (§28, §29, §48–§50) and are designed **before** any screen. Each journey has a click budget, required states and an E2E scenario ID (`E2E-Jn`). "Interaction" = one click, tap, selection or submitted field group. Typing inside a field doesn't count.

Personas for realistic data (invented): tutor **Cô Lan**; students **Nguyễn Minh Anh** (TOEIC 570 → 650, weak at listening), **Trần Gia Bảo** (IELTS 5.5 → 6.5, writing), **Lê Thu Hà** (grade 12 exam prep).

---

<a id="j1"></a>

## J1 — After a lesson (§28, §48) · the most important flow · M5
**Goal:** close a lesson in under a minute, from the dashboard, with one save.

1. **Today** shows the 19:00 session for Minh Anh with a **Wrap up** button. A session that ended in the last 3 hours is highlighted. *(1)*
2. The wrap-up sheet opens over Today with these fields:
   - **Status**: segmented control, *Completed* preselected; Absent and Cancelled are alternatives.
   - **What we covered** (visible to the student): textarea, prefilled with the lesson plan title if one is linked.
   - **Private note** (only you): textarea with a lock icon.
   - **Materials**: chips for materials already linked to the session or lesson, then *+ Add* (search the library or upload). *(2: open the picker, 3: pick an item)*
   - **Homework**: *+ Assign activity* (search, recent first, with the lesson's suggested activities at the top) and a due date that defaults to the day before the next scheduled session, otherwise +7 days. Or *Quick task*: title + "answer by text / file". *(4: open, 5: pick, 6: confirm the due date or accept the default)*
3. **Save** *(7)*. The sheet closes, a toast says "Lesson saved · homework assigned", and the row on Today shows ✓ Completed.

Budget: **≤ 7 interactions** (FR-LES-AC1). Absent or cancelled: **2** (status + save).
States: a save failure keeps every field and shows the error at the top of the sheet. Closing the sheet with unsaved input asks for confirmation. On a phone, the sheet is full-screen with the Save button sticky at the bottom.
Not in the flow: navigating to the student workspace (it's reachable through a link in the sheet header).

<a id="j2"></a>

## J2 — Add a student (§49) · M1
1. Students → **+ Add student** (or a quick action on Today). *(1)*
2. Form, step 1 of 1. Required: **Full name**, **Username** (suggested from the name: "nguyen.minhanh", editable, uniqueness checked on blur), **Temporary password** (generated, with Copy and Regenerate). Optional sections (Contact, Parent/guardian, Learning profile, Notes) are collapsed. *(2: Create)*
3. A success panel shows "Account created", with the username and password in a copyable block and *Copy message* (prefilled bilingual text: "Your account: … Password: … Log in at …") for pasting into Zalo. **The password is shown only here.**
4. Then: **Set a goal** (inline mini-form), **Create learning plan** (opens the plan tab), **Schedule first session**, or **Done**. All optional (§49 "configured progressively").

Budget: **2 interactions** to a usable account. States: duplicate username → inline error with a suggestion ("nguyen.minhanh2").

<a id="j3"></a>

## J3 — Create an assessment and assign it (§50) · M4
1. Activities → **+ Create** → choose *Assessment* (or *Assignment*). *(1–2)*
2. Builder (full page): **Name**, optional description and instructions.
3. **Sections**: "+ Add section" (title, instructions). For assignments, sections stay hidden until a second one is added.
4. **Items** within a section: *Add from bank* (a picker with search, type, tag and difficulty filters; multi-select) or *New question* (inline editor; saved to the bank automatically).
5. **Scoring and time** panel (right column on desktop, collapsible section on phones): points per item (defaults to the question's points), pass mark %, time limit, attempts, release policy (immediate / after review), show answers after grading.
6. **Save** (`Ctrl+S`). The sticky footer shows the total questions and points.
7. **Assign**: pick students (multi), available from, due date, optional metric "record result to" (for example a "Mock test score" metric, created inline if missing). Confirm.

Any step can be revisited later. Assigning snapshots the content (ADR-0009), so the builder warns "N students have this assigned; changes won't affect their copies".

<a id="j4"></a>

## J4 — Grade a submission · M4
1. **Review** (nav badge with the count) → queue sorted oldest first: student, activity, submitted time, number of items needing review. *(1)*
2. Grading screen. Left: items in order; auto-graded items are collapsed with their score, and items needing review are expanded. Right (desktop) or bottom (phone): **overall comment**, **rubric** (add criteria such as "Pronunciation 0–10"; criteria from the student's last graded activity are offered), and the total.
3. Each manual item: the student's answer (text, file preview or audio player), a score field (0–max), a comment.
4. **Release** (or *Save draft*). The next item in the queue opens automatically.

Budget per manual answer: score + optional comment. Keyboard: `J`/`K` to move between items.

<a id="j5"></a>

## J5 — Student does homework (§29) · M4
1. Login → **Home**: "Today's tasks" lists due items, soonest first. *(1: open a task)*
2. Task page: instructions, materials, due date, attempts used, time limit ("45 minutes once you start"). **Start**. *(2)*
3. Attempt screen: one item per screen on phones; all items scrollable on desktop, with a section navigator and an answered/unanswered map. Autosave indicator. Timer when there's a time limit (also announced to screen readers at 5 minutes and 1 minute).
4. **Submit** → confirmation listing unanswered items → submitted. *(3–4)*
5. Result: an immediate score (auto-graded with immediate release), or "Waiting for your tutor's review". Later, Home shows "New result" → score, feedback, rubric, and answers and explanations if enabled.

States: offline or save failure → "Not saved — Retry", and the answer is kept in memory. Time expiry → auto-submitted with an explanation.

<a id="j6"></a>

## J6 — Edit a learning plan · M6
Student → **Plan** tab. Phases are vertical sections; items are rows with a status control. Actions: + Phase, + Item (milestone, activity or note), drag (or "Move to…" menu) to reorder or move between phases, status dropdown, priority, link (goal, content, lesson, activity). Edits save per action (optimistic, with undo on failure), and there is no global Save. A student preview toggle shows "what the student sees".

<a id="j7"></a>

## J7 — Create a lesson plan and schedule sessions · M5
Library → Lessons → + New: title, duration, body, materials, suggested homework → Save. Calendar → click a slot (or + Schedule): student, start time (prefilled from the slot), duration (from the lesson), mode, meeting link (remembered per student) → Save. *(4 interactions from the calendar.)* OD-01 adds "Duplicate to next week" on a session.

<a id="j8"></a>

## J8 — See progress and adjust (§46 "see student progress, so that I can adjust the plan") · M7
Student → Overview: the progress strip shows activities done/assigned, average %, attendance, goals (each with a progress bar: "570 → 650 · 40%"), and an assessment score sparkline. Each figure links to its detail (Work tab filtered, metric chart). The "Adjust plan" button goes to the Plan tab. There are no charts without a decision attached to them.

<a id="j9"></a>

## J9 — Create a simple assignment from the bank · M4
Activities → + Create → Assignment → add 10 questions from the bank (filter by tag "Past simple") → due date at assign time → assign to 2 students. **≤ 8 interactions** after the bank filter.

---

## Journey → E2E mapping

| Journey | E2E scenario | Runs |
|---|---|---|
| Login, forced password change, logout | `E2E-AUTH` | every E2E run |
| J2 | `E2E-J2` | PR when the Students module or web/students changes; release |
| J5 + J4 (assign → answer → grade → student sees feedback) | `E2E-J4J5` | PR when Activities changes; release |
| J1 | `E2E-J1` | PR when Lessons or Activities assign changes; release |
| J3 | `E2E-J3` | release; PR when the builder changes |
| Student isolation in the UI (B cannot open A's task URL) | `E2E-ISO` | every E2E run |
| J6, J7, J8, J9 | `E2E-J6`… | release |
