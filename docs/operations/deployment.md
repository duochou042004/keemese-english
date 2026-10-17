# Deployment (portable; target undecided, PD-11 / OD-06)

## Deployable unit

- **One image**: the ASP.NET Core app with the SPA in `wwwroot`. Multi-stage `deploy/Dockerfile`: a Node stage builds `web/` → an SDK stage publishes → the runtime image `mcr.microsoft.com/dotnet/aspnet:10.0`, running as a non-root user.
- **PostgreSQL 18**: in Compose, or a managed instance.
- **One persistent volume** at `DATA_DIR` (`/data`), holding `files/` and `keys/`.
- **TLS termination** in front: a reverse proxy (Caddy, nginx, Traefik) or the platform's ingress. Configure `ForwardedHeaders` with the proxy's address.

## Configuration (environment only)

| Variable | Required | Notes |
|---|---|---|
| `ConnectionStrings__Db` | ✅ | |
| `DATA_DIR` | ✅ | Must be persistent and backed up |
| `ASPNETCORE_URLS` | — | Default `http://+:8080` |
| `ASPNETCORE_ENVIRONMENT` | — | `Production` |
| `BOOTSTRAP_TUTOR_USERNAME` / `_PASSWORD` | first run only | Remove after the first login |
| `Security__IpHashSalt` | ✅ | A random 32+ character string |
| `ForwardedHeaders__KnownProxies` | if behind a proxy | |
| `Uploads__MaxBytes__Document` / `__Audio` / `__Video` / `__Image` | — | OD-03 defaults |
| `Database__MigrateOnStartup` | — | Default `true`. Set `false` to run `--migrate` manually |
| `APP_NAME` | — | Display name (OD-02) |

## Options compared (for OD-06; nothing is chosen yet)

| Option | Fits when | Watch out for |
|---|---|---|
| Small VPS + `compose.yaml` + Caddy | Cheapest, full control | You own OS patching, backups and monitoring |
| Container PaaS (any provider with persistent volumes) + managed Postgres | Less operations work | A **persistent volume is required** for `DATA_DIR` (otherwise add an S3 adapter, ADR-0007). The single-instance assumption holds |
| On-premise mini PC | Data stays at home | Uptime and remote access need a tunnel |

All options keep **SPA and API on one origin** (ADR-0004). Single instance: no horizontal scaling (A1). Two instances would need shared Data Protection keys and file storage, which is a new ADR.

## Production checklist (release gate R1.0)

- HTTPS only, HSTS on. Cookies `__Host-`, Secure.
- `BOOTSTRAP_*` removed after the first login. The default tutor password has been changed (enforced by `must_change_password`).
- Backups scheduled and a **restore drill done** ([runbooks](runbooks.md#backup)).
- `/health/ready` monitored (an uptime checker).
- Logs go to stdout and are retained by the host for at least 14 days, with no PII.
- DB not publicly reachable. Volume permissions limited to the app user.
- Image built from a `vX.Y.Z` tag. Rollback = redeploy the previous tag + restore the DB if a migration is incompatible (see the runbooks).
