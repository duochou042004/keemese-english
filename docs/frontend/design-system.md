# Design System

Character (§55): **"a private teacher's digital workspace"**. It should feel calm, legible, dense enough for a laptop and friendly on a phone. It should not look like an enterprise LMS (§40.6) or a generic AI dashboard.

Foundation: Tailwind v4 tokens in `web/src/styles/theme.css` (`@theme`), shadcn/ui components in `web/src/components/ui` (owned code), Radix primitives (ADR-0014).

## Tokens

### Color (light theme only in MVP; names are semantic so dark mode can be added later)
| Token | Use | Value (initial, tune in M1 against contrast checks) |
|---|---|---|
| `--color-bg` | App background | `oklch(0.985 0.003 250)` near-white, cool |
| `--color-surface` | Panels, cards, inputs | `oklch(1 0 0)` |
| `--color-surface-muted` | Table header, subtle fills | `oklch(0.965 0.005 250)` |
| `--color-border` | Dividers, input borders | `oklch(0.9 0.008 250)` |
| `--color-text` | Body | `oklch(0.24 0.02 260)` |
| `--color-text-muted` | Secondary text (≥ 4.5:1 on bg) | `oklch(0.48 0.02 260)` |
| `--color-primary` / `-fg` | Primary actions, links, focus | deep teal `oklch(0.5 0.1 200)` / white |
| `--color-success` | Completed, graded, achieved | green |
| `--color-warning` | Overdue, needs attention | amber (text on amber uses `--color-text`) |
| `--color-danger` | Destructive, errors | red |
| `--color-info` | Scheduled, neutral status | blue |

Rules:
- **One** accent (primary). No gradients, no decorative color.
- Status is never conveyed by color alone: always add a text label or icon (WCAG 1.4.1).
- Text contrast is ≥ 4.5:1, and ≥ 3:1 for large text and UI component boundaries (WCAG 1.4.3 / 1.4.11).

### Typography
- Inter Variable, self-hosted. `font-feature-settings: "tnum"` on numbers in tables and scores.
- Scale (rem): 0.8125 caption · 0.875 small · **1 body** (16 px; phones never go below this, which also avoids iOS input zoom) · 1.125 lead · 1.375 h3 · 1.75 h2 · 2.25 h1 (used rarely).
- Line height 1.5 for body and 1.25 for headings. Vietnamese stacked diacritics (ặ, ể, ỗ) need this room, so **never** set a line height below 1.25.
- **No ALL CAPS** for labels: it hurts readability of Vietnamese diacritics and rendering. Use weight and size for hierarchy instead.
- Weights: 400 body, 500 labels and buttons, 600 headings.

### Spacing, radius, elevation
- 4 px base. Use the scale 1, 2, 3, 4, 6, 8, 12, 16 (×4 px). Section gap 24–32 px; field gap 16 px; dense table row padding 8–12 px.
- Radius: 6 px controls, 10 px panels, full for pills and avatars.
- Elevation: borders by default. Shadow only for overlays (popover, dialog, sheet).
- Hit targets ≥ 44×44 px on touch layouts; ≥ 32 px on desktop pointer layouts (still above the WCAG 2.5.8 minimum of 24 px).

### Motion
150–200 ms ease-out for overlays and expanding sections. Respect `prefers-reduced-motion` (turn off non-essential motion).

## Components (inventory)

**From shadcn/ui (Radix):** Button, Input, Textarea, Label, Select, Combobox (Command + Popover), Checkbox, RadioGroup, Switch, Dialog, AlertDialog, Sheet, DropdownMenu, Tabs, Tooltip, Popover, Toast (sonner), Badge, Separator, Skeleton, Calendar + DatePicker (react-day-picker, localized), Table.

**Project components (build once, reuse everywhere):**

| Component | Purpose |
|---|---|
| `AppShell` (tutor or student variant) | Navigation per the [IA layout shells](information-architecture.md#layout-shells) |
| `PageHeader` | Title, optional breadcrumb, at most one primary action + overflow menu |
| `EmptyState` | Icon, one sentence on what this is, a primary action. Never just "No data" |
| `ErrorState` | Message from the error code, a Retry button, `traceId` in small text |
| `StatusPill` | Session, task, goal and plan statuses: icon + text + semantic color |
| `ProgressBar` | Goal and plan progress with a text value ("570 → 650 · 40%") |
| `MetricChart` | Small SVG line chart (no chart library) for readings and scores |
| `ListRow` / `DataList` | Rows with a primary line + metadata line. On phones the same component stacks (no horizontal-scroll tables) |
| `FilterBar` | Search + filter chips bound to URL search params |
| `RichText` / `RichTextEditor` | The only place rich content is rendered or edited (OD-05) |
| `FilePicker` / `MaterialPicker` | Upload or choose from the library in one popover |
| `StudentPicker` | Combobox with recent students first |
| `DateTimeField` | Localized date + time, with time-zone label |
| `ConfirmDestructive` | AlertDialog. Requires typing the name for permanent deletes |
| `SaveIndicator` | "Saving… / Saved 12:03 / Not saved — Retry" for autosave screens |

## Interaction patterns

| Situation | Pattern |
|---|---|
| Create a simple thing (folder, note, goal, metric reading) | Inline form or small dialog. Stay on the page. Toast "Saved" |
| Create or edit a complex thing (activity, question, lesson, plan) | Full page with a sticky footer (Save / Cancel), an unsaved-changes guard, and `Ctrl/Cmd+S` |
| Session wrap-up (J1) | Side **sheet** on desktop and tablet, full-screen sheet on phone, on top of Today or the session page. One Save |
| Lists | Search + filters in the URL; sort by the most useful default (soonest due, newest); pagination via "Load more" (lists are small) |
| Destructive | Archive → toast with **Undo** (5 s). Permanent delete → AlertDialog with name confirmation |
| Async buttons | Disabled + spinner while pending; double submits impossible; the form keeps its values on error |
| Loading | Route data is prefetched. A skeleton appears only after a 300 ms delay (avoids flashes). Never a full-page spinner after the first load |
| Errors | Field errors inline under fields + focus moves to the first invalid field; form-level errors in an alert at the top; network errors as `ErrorState` with Retry |
| Empty | Explain + offer the next action (for example "No sessions this week · Schedule a session") |
| Success feedback | Toast for 3 s for background confirmations. Don't toast when the screen already shows the result |
| Keyboard | All actions reachable by keyboard. Visible focus ring (2 px primary + offset). Shortcuts only as additions: `/` focuses search, `N` creates in list pages (shown in tooltips) |
| Reordering (plan, sections, items) | Drag handle **plus** "Move up/down" menu items (keyboard-accessible alternative) |
| Time | Show relative and absolute together: "Tomorrow 19:00 · Thu 22/10". The time zone label appears only when it differs from the browser's |

## Anti-patterns (reject in review)

- A dashboard of KPI cards and charts with no actions (§27: "dashboard must prioritise action").
- Cards inside cards. Every list wrapped in a card. Equal visual weight for everything.
- Cramped tables with 8+ columns, or tables that scroll horizontally on phones.
- Arbitrary gradients, glassmorphism, emoji as UI icons, decorative illustrations on work screens.
- Inconsistent spacing (values off the scale), more than one primary button per view, icon-only buttons without an accessible label or tooltip.
- Layouts verified at only one viewport. Lorem ipsum or "Test 1" data in reviews.
- Modals stacked on modals. Forms that ask for 30 things before creating something (§40.3).
- Hard-coded strings (all UI text must go through i18n).

## Visual QA checklist (per screen, at every UI PR touching it)

Do this with **realistic data**: long Vietnamese names ("Nguyễn Thị Phương Thảo"), 0 / 1 / many items, a long title, both languages.

1. 1440, 1024, 768 and 390 px: no horizontal scroll; nothing clipped; primary action visible without hunting.
2. Hierarchy: one clear title, one primary action, secondary actions de-emphasized.
3. Spacing is on the scale; alignment is consistent; nothing touches container edges on phones (16 px gutter minimum).
4. Loading, empty and error states each seen at least once.
5. Keyboard: Tab order is logical, focus is visible, Esc closes overlays, focus returns to the trigger.
6. axe: no serious or critical violations.
7. Vietnamese text fits (it is often 20–30 % longer); diacritics are not clipped in buttons or pills.
8. Screenshots (in both languages if the layout changed) attached to the PR or saved under `docs/delivery/evidence/` at gates.
