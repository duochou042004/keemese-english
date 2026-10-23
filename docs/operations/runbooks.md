# Runbooks: Troubleshooting and Recovery

<a id="backup"></a>

## Backup
**What:** the database (logical dump) **and** `DATA_DIR` (files + Data Protection keys). One without the other is incomplete.

```bash
# database (from the host running compose)
docker compose --env-file .env -f deploy/compose.yaml exec -T db pg_dump -U keemese -Fc keemese > backup-$(date +%F).dump
# files: copy the appdata volume (example using a throwaway container)
docker run --rm -v keemese_appdata:/data -v "$PWD":/backup docker.io/library/alpine tar czf /backup/data-$(date +%F).tgz -C /data .
```
(On Windows PowerShell, replace `$(date +%F)` with `$(Get-Date -Format yyyy-MM-dd)`. With Podman, replace `docker` with `podman`.)

Rotation (recommended): daily backups kept 14 days, weekly kept 8 weeks, stored **off the host**. The backups are encrypted at rest because they contain personal data.

<a id="restore"></a>

## Restore
1. Stop the app container (keep `db` running).
2. `pg_restore -U keemese -d keemese --clean --if-exists < backup.dump` (via `exec -T db`).
3. Restore `DATA_DIR` from the archive into the volume.
4. Start the app and check `/health/ready`, then log in as the tutor and open one student's file.
5. Record the drill in `docs/delivery/evidence/` (date, durations, issues). **Required once before release 1.0** (NFR-OPS-01).

## Rollback a bad release

1. Redeploy the previous image tag.
2. If the bad release ran a migration that the previous version can't read, restore the pre-deploy backup. **Take a backup before every production migration.**

## Lost tutor password

There's no email reset (PD-07). With shell access to the host:
`docker compose --env-file .env -f deploy/compose.yaml exec app dotnet Keemese.Api.dll --reset-tutor-password` prints a new temporary password once (implemented in M1, T-102). This is the only recovery path, and it is an intended operator capability.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Everyone logged out after a restart | Data Protection keys aren't persisted | Make sure `DATA_DIR/keys` is on the persistent volume |
| `401` loop in the SPA in development | Vite proxy not forwarding cookies, or the API runs on a different port | Check `web/vite.config.ts` proxy target = `http://localhost:5080`, and use the same host name (`localhost`, not `127.0.0.1`, on both sides) |
| `400` on POST in development | Missing antiforgery token | Log in again (it's issued at login). Check that the `X-XSRF-TOKEN` header is sent |
| Port 5432 already in use | A local Postgres is installed | Set `DB_PORT` in `.env` and in the connection string |
| Upload fails with 413 | Over the limit (OD-03) | Expected. Raise the limit via `Uploads__MaxBytes__*` if justified |
| Garbled Vietnamese in a downloaded file name | Missing RFC 6266 `filename*` | Bug: report it (it should be UTF-8 encoded) |
| Files show CRLF changes on Windows | Pre-`.gitattributes` checkout | `git add --renormalize .` once on a clean tree |

<a id="testcontainers-cannot-reach-docker"></a>

### Testcontainers cannot reach Docker
- Docker Desktop: make sure it's running. On Windows the named pipe is detected automatically.
- Podman (Linux): `systemctl --user enable --now podman.socket`, then `export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock`. If Ryuk fails: `export TESTCONTAINERS_RYUK_DISABLED=true` (clean up leftover containers manually).
- Podman (macOS/Windows): use the socket that `podman machine inspect` reports. Podman Desktop can expose a Docker-compatible socket.
