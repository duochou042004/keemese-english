---
name: new-adr
description: Draft an Architecture Decision Record (status Proposed) when a technical choice is made or changed. Agents propose; only the Lead Coordinator accepts.
disable-model-invocation: true
argument-hint: "[short title]"
---

1. Find the next number: the highest `docs/decisions/NNNN-*.md` + 1.
2. Create `docs/decisions/NNNN-<kebab-title>.md` with: `# ADR-NNNN: <Title>`, `Status: Proposed (<date>)`, then **Context** (facts with sources/dates), **Decision**, **Alternatives** (with the reason each was rejected), **Consequences**, **Revisit when**.
3. If it supersedes an ADR, set the old one's status to `Superseded by ADR-NNNN` only after acceptance.
4. Add a row to the ADR table in `docs/decisions/README.md`.
5. Keep it under about 60 lines. Link the requirements (FR/NFR/PD) it serves.
6. Tell the Lead Coordinator it needs a decision. Do not implement a Proposed ADR that switches technology.
