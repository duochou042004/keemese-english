# Next session: write the M2 and M3 task packets

You are continuing work on keemese-english, a private 1:1 tutoring workspace (one tutor, the students that tutor creates).
The SessionStart briefing shows live state. Read AGENTS.md and progress.json. Do not rely on chat history.

## State (verified 2026-10-24)
- M1 is closed: T-101..T-110 merged into `develop`; the M1 gate PR #27 merged as ecce50e with the owner's approval. Evidence: docs/delivery/evidence/m1.md.
- The M1 gate added a startup check: outside Development the app refuses a `change-me` `Security__IpHashSalt`. A local `.env` copied from `.env.example` needs a random salt before `--profile app` or local E2E.
- Verified at the gate: build 0/0, unit 27/27, integration 38/38, vitest 122/122, E2E 5/5, gitleaks full history clean.

## The one next task
Write the M2 (workspace: profile, goals, notes) and M3 (content & files) task packets in docs/delivery/tasks/, following the existing packet format (T-101..T-110) and docs/delivery/milestones.md. M2 and M3 touch disjoint modules and can run in parallel.
- M2 needs **OD-08** (learning profile hidden from students) answered; M3 needs **OD-03** (upload limits) and **OD-05**. See docs/decisions/README.md.
- Ask the owner for any unanswered OD before writing a packet that depends on it. Packets go through a PR and need the owner's approval before implementation starts.

## Open owner actions
See `pending_owner_actions` in progress.json: branch protection + required checks (incl. e2e-smoke), the T19 doc note, OD-01/02/04/07/08, the guard-hook rule.

## Stop conditions
Context ≥ 320k (HANDOFF) → handoff per docs/agents/handoff.md. A packet needs an unanswered OD → ask the owner and stop. Packets PR open and the owner asked to approve → stop.
