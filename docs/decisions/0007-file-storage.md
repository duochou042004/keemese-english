# ADR-0007: Files on a local volume behind `IFileStorage`

Status: Accepted (2026-10-17)

## Context
The spec suggests S3-compatible storage or MinIO (§36) and warns against a Drive clone (§38). File volume is small (assumption A1: ≤ 10 GB). The deployment target is undecided (PD-11).

## Decision
- One interface, `IFileStorage` (`SaveAsync(stream) → key`, `OpenReadAsync(key)`, `DeleteAsync(key)`), with one implementation in MVP: **`LocalFileStorage`**, which writes to `${DATA_DIR}/files/{yyyy}/{mm}/{uuid}`. Storage keys are generated on the server. User-supplied names are never part of a path.
- File metadata lives in `stored_files` (original name, sniffed content type, size, SHA-256, uploader).
- Downloads go **only** through `GET /api/files/{id}`, which checks authorization ([security model](../security/security-model.md#file-access)) and streams with range support. No public bucket, no signed URLs in MVP.
- Limits come from configuration (OD-03). The type is checked against an allowlist by extension **and** by magic-byte sniffing.

## Alternatives
- MinIO in Compose: one more service to run, update and back up, with no benefit at this size.
- Storing files in PostgreSQL `bytea`: bloats backups and makes streaming awkward.

## Consequences
- Backups must include `${DATA_DIR}` along with the database ([runbooks](../operations/runbooks.md#backup)).
- An S3 adapter is a single new class if a host lacks persistent volumes. Add one only when OD-06 needs it.

## Revisit when
The chosen host has no persistent volume, or storage exceeds about 50 GB.
