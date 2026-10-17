# Activity Engine: Questions, Attempts, Grading, Progress Math

Decisions: ADR-0009 (snapshot), ADR-0010 (one engine), PD-04 (types), PD-13 (best attempt).

## Question type strategy

Each type is one class implementing:

```csharp
interface IQuestionType
{
    string Type { get; }                                 // "single_choice"
    AppError? ValidatePayload(JsonElement payload);      // answer key consistent with options
    AppError? ValidateResponse(JsonElement payload, JsonElement response);
    GradeResult Grade(JsonElement payload, JsonElement response, decimal points); // Auto(score) | NeedsReview
    JsonElement RedactForStudent(JsonElement payload);   // strip answer key
}
```

They are registered in a dictionary keyed by `Type`. Adding a type (Phase 2: matching, ordering, audio recording) means **one new class plus its UI components**, with no change to the engine. That's the extension mechanism; there is no plugin system.

## Question payloads

`prompt` and `explanation` are rich text JSON. Option IDs are short strings generated on the client (`"a1"`), so they stay stable across edits.

| Type | `payload` (tutor) | `response` (student) | Auto-grading |
|---|---|---|---|
| `single_choice` | `{options:[{id,text}], correct:"b"}` | `{choice:"b"}` | Full points if equal, else 0 |
| `multiple_choice` | `{options:[…], correct:["a","c"]}` | `{choices:["a","c"]}` | **All-or-nothing**: the sets must be equal |
| `true_false` | `{correct:true}` | `{value:true}` | Equal → full |
| `fill_blank` | `{text:"I {{1}} to school {{2}}.", blanks:{"1":{accept:["go","walk"]},"2":{accept:["every day"]}}, caseSensitive:false}` | `{blanks:{"1":"go","2":"Every day "}}` | Per blank: `points × correct/total`, rounded to 2 decimal places |
| `short_answer` | `{accept:["reviewed"]? , caseSensitive:false}` | `{text:"Reviewed"}` | If `accept` is non-empty: match → full, no match → **NeedsReview** (not 0, so the tutor can accept a variant). If empty → NeedsReview |
| `long_answer` | `{minWords?, maxWords?}` | `{text:"…"}` | Always NeedsReview |
| `file_upload` | `{allowed:["document","image","audio"], maxFiles:3}` | `{fileIds:[…]}` | Always NeedsReview |

**Normalization for matching** (text types): Unicode NFC → trim → collapse internal whitespace to one space → lowercase unless `caseSensitive`. Diacritics are **significant** ("hoc" ≠ "học"); this is a language-learning product.

## Snapshot shape

```json
{
  "activity": {"title":"…","kind":"assessment","timeLimitMinutes":45,"passPercent":60,
               "maxAttempts":1,"releasePolicy":"after_review","showAnswers":"after_grading",
               "instructions":{…}},
  "sections": [{"key":"s1","title":"Part 5","instructions":{…},
                "items":[{"key":"i1","questionId":"…","type":"single_choice","points":1,
                          "prompt":{…},"payload":{…},"explanation":{…},"fileIds":["…"]}]}],
  "maxScore": 100
}
```

`itemKey` values (`i1`, `i2`, …) are unique within the snapshot. Answers reference them.

## Redaction

`RedactForStudent(snapshot, releasedAndShowAnswers)`:
- Before release, or when `showAnswers = never`: remove `payload` answer keys (`correct`, `accept`) and `explanation`. Item point values stay visible, since they help the student plan.
- **Before release, no scores at all**: no per-answer `autoScore`/`manualScore`/`finalScore`, no attempt totals, no `percent`/`passed`. Otherwise the per-answer auto scores would reveal which choices were correct (threat T21). Students see "Submitted · waiting for review" until release.
- After release with `showAnswers = after_grading`: include the answer keys and explanations.
- Applied in one function used by **every** `/api/me` task and attempt response. The isolation suite checks for the absence of `correct` / `accept` / `explanation` keys before release.

## Attempt flow

1. **Start**: checks status ∉ {cancelled}, `now ≥ available_from`, no open attempt, attempts used < `max_attempts + extra_attempts` (null = unlimited). Creates an attempt `number = n+1`, `deadline_at = now + time_limit` when a limit is set. The student activity becomes `in_progress`.
2. **Autosave**: `PUT answer`. Allowed while the attempt is `in_progress` and `now ≤ deadline_at + 30 s` grace. The client saves on change (debounced 800 ms) and on blur, and shows "Saved · 12:03".
3. **Lazy expiry**: any read or write of an attempt past `deadline_at + 30 s` first auto-submits it (same path as submit, with `submitted_at = deadline_at`).
4. **Submit**: grade every item. If **no** item needs review and `release_policy = immediate` → attempt `graded`, release now. Otherwise the attempt is `submitted` and the student activity is `submitted` (it enters the review queue).
5. **Tutor grade**: set manual scores (0 ≤ score ≤ points) and comments, overall comment, rubric. `release: true` → attempt `graded`, `released_at` set, best-attempt recomputed, metric reading recorded if `metric_id` is set. The value is the student activity's `percent` or its raw `score`, according to `metric_value` (`percent` | `score`), which the tutor picks when assigning.
6. **Best attempt** (PD-13): highest `total_score` among graded attempts. Ties → the earliest attempt.

## Progress math (ADR-0015)

| Figure | Definition |
|---|---|
| Activities completed / assigned | count(status = graded) / count(status ≠ cancelled) |
| Average % | mean of `percent` over graded student activities. "—" if none |
| Assessment series | `percent` (or a linked metric's readings) of graded assessments, ordered by `released_at` |
| Attendance | completed / (completed + absent) over past sessions. Cancelled sessions are excluded |
| Goals | achieved / (all − dropped) |
| Goal % | `clamp((current − baseline) / (target − baseline), 0, 1)` with current = latest reading. Undefined if baseline = target |
| Plan completion | done / (all − skipped) items |
| Needs attention (tutor) | a student with an overdue task, an absence in the last 14 days, or no completed session or submission in the last 21 days |

Each row in this table gets a unit test, including the zero-data and division-by-zero cases (FR-PROG-AC1).
