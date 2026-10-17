# ADR-0003: PostgreSQL 18

Status: Accepted (2026-10-17)

## Context
The spec allows SQL Server or PostgreSQL (§36). The requirements need flexible per-type data (question payloads, snapshots, custom fields), diacritics-insensitive search over Vietnamese text, and a portable container setup on Windows, macOS and Linux, including Podman.

## Decision
PostgreSQL **18** (current stable; image `postgres:18.6-alpine` at the time of writing — pin a minor tag in `compose.yaml` and update it via Dependabot). Provider: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.x.

Features we rely on, and only these:
- `jsonb` for question payloads, activity snapshots, answer responses, custom fields and rubric criteria
- `text[]` with GIN indexes for tags
- `unaccent` (bundled contrib) for diacritics-insensitive search
- `NULLS NOT DISTINCT` unique indexes (PG 15+) for folder-name uniqueness at the root
- `xmin` as the optimistic concurrency token

## Alternatives
- SQL Server: heavier container, a weaker multi-arch image story (ARM macOS), JSON support weaker for our use.
- SQLite: tempting for a single tutor, but concurrent writes from students plus weaker JSON and array support. Integration tests would diverge from production.

## Consequences
- Integration tests run against real PostgreSQL via Testcontainers, never the EF in-memory provider.
- Postgres 19 is in release-candidate stage. Don't upgrade until it is GA, Npgsql supports it, and an ADR records the move.

## Revisit when
The hosting target only offers a different managed database (OD-06).
