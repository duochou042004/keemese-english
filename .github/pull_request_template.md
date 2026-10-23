## Task
<!-- Task ID and packet, e.g. T-003 (docs/delivery/tasks/T-003-…md). Requirements traced: FR-* / NFR-* / PD-*. -->

## Risk ladder level
<!-- L1–L4 (docs/testing/strategy.md) and why. -->

## Evidence
<!-- Commands run in this change and their results (counts, exit codes). CI run URL once green. -->

## Not run
<!-- What was not verified and why. "Nothing" is a valid answer only if true. -->

## Checklist
- [ ] Within the packet's file ownership; nothing outside scope (AGENTS.md invariants)
- [ ] No secrets, real student data or real screenshots
- [ ] UI strings in i18n with `vi` and `en` keys (if UI changed)
- [ ] `progress.json` evidence and affected docs updated
- [ ] Reviewer (L3/L4) and security-reviewer (auth, files, DTOs, CI) results recorded
