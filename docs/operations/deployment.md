# Deployment (portable; target undecided, PD-11 / OD-06)

## Deployable unit

- **One image**: the ASP.NET Core app with the SPA in `wwwroot`. Multi-stage `deploy/Dockerfile`: a Node stage builds `web/` → an SDK stage publishes → the runtime image `mcr.microsoft.com/dotnet/aspnet:10.0`, running as a non-root user.
- **PostgreSQL 18**: in Compose, or a managed instance.
- **One persistent volume** at `DATA_DIR` (`/data`), holding `files/` and `keys/`.
- **TLS termination** in front: a reverse proxy (Caddy, nginx, Traefik) or the platform's ingress. Configure `ForwardedHeaders__KnownProxies` (or `__KnownNetworks`) with the proxy's address, so the app sees the original scheme and client IP. Outside Development/Testing the app sends HSTS (180 days, no preload) on HTTPS responses and redirects plain HTTP to HTTPS when it knows the HTTPS port (`HTTPS_PORT`); behind the proxy the forwarded proto is already `https`, so nothing is redirected. Let the proxy redirect port 80. Outside Development the session and antiforgery cookies are `Secure`, so the app must see HTTPS (directly or through a trusted proxy): a plain-HTTP login fails with a 500 instead of issuing cookies.

## Configuration (environment only)

| Variable | Required | Notes |
|---|---|---|
| `ConnectionStrings__Db` | ✅ | |
| `DATA_DIR` | ✅ | Must be persistent and backed up |
| `ASPNETCORE_URLS` | — | Default `http://+:8080` |
| `ASPNETCORE_ENVIRONMENT` | — | `Production` |
| `BOOTSTRAP_TUTOR_USERNAME` / `_PASSWORD` | first run only | Remove after the first login |
| `Security__IpHashSalt` | ✅ | A random 32+ character string |
| `ForwardedHeaders__KnownProxies` | if behind a proxy | Comma-separated proxy IPs allowed to send `X-Forwarded-For` / `X-Forwarded-Proto`. Empty (default) = trust nobody, including loopback |
| `ForwardedHeaders__KnownNetworks` | if behind a proxy | Comma-separated CIDR ranges, e.g. the Compose network (`172.16.0.0/12`) when the proxy IP is not fixed |
| `AllowedHosts` | — | Default `*` until the host is known (OD-06). Set to the public host name, e.g. `app.example.com` |
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
