# Local Development Setup (Windows · macOS · Linux)

Commands are given once when they're the same on every OS. Shell-specific variants are marked. **The scaffolding these commands need arrives in M0** (T-001 to T-003). Until then this is the target.

## Prerequisites

| Tool | Version | Windows | macOS | Linux |
|---|---|---|---|---|
| .NET SDK | 10.0.4xx (`global.json`) | `winget install Microsoft.DotNet.SDK.10` | `brew install --cask dotnet-sdk` | [Microsoft packages](https://learn.microsoft.com/dotnet/core/install/linux) |
| Node.js | 24 LTS (`.nvmrc`) | `winget install OpenJS.NodeJS.LTS`, or fnm / nvm-windows | `brew install node@24`, or fnm / nvm | fnm / nvm / distro packages |
| Container engine | Docker Engine/Desktop with Compose v2+, **or** Podman 5+ with `podman compose` | Docker Desktop (WSL 2 backend) or Podman Desktop | Docker Desktop, OrbStack or Podman Desktop | Docker Engine or Podman |
| Git | 2.40+ | Git for Windows | Xcode CLT or brew | distro |

Not required: Python, a global `psql`, global npm packages. *(Python was installed on the main dev machine but isn't used by the project. If a future script needs it, an ADR has to say so.)*

Status on the main development machine (Windows 11, checked 2026-10-17): .NET SDK 10.0.402 ✅, Node 24.21.0 / npm 11.19 ✅, Docker Desktop 29.8.2 + Compose v5.6.0 ✅, Git 2.56 ✅, GitHub CLI 2.102 ✅. Podman isn't installed: Podman compatibility is checked by design (rules below) and should be verified on a machine that has it before release 1.0.

## First run (target, after M0)

```bash
git clone https://github.com/<owner>/keemese-english.git
cd keemese-english
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
docker compose -f deploy/compose.yaml up -d db     # or: podman compose -f deploy/compose.yaml up -d db
dotnet run --project src/Keemese.Api               # http://localhost:5080, applies migrations
npm ci --prefix web
npm run dev --prefix web                           # http://localhost:5173 (proxies /api)
```
Log in with `BOOTSTRAP_TUTOR_USERNAME` / `BOOTSTRAP_TUTOR_PASSWORD` from `.env`. You must change the password on first login.

Full stack in containers (closest to production): `docker compose -f deploy/compose.yaml --profile app up --build` → http://localhost:8080.

## `.env.example` (created in T-001; placeholders only)

```dotenv
POSTGRES_PASSWORD=change-me-local-only
ConnectionStrings__Db=Host=localhost;Port=5432;Database=keemese;Username=keemese;Password=change-me-local-only
DATA_DIR=./.data
BOOTSTRAP_TUTOR_USERNAME=tutor
BOOTSTRAP_TUTOR_PASSWORD=change-me-on-first-login
Security__IpHashSalt=change-me-random-string
APP_NAME=Keemese
```

## Compose portability rules (Docker and Podman)

- File name `compose.yaml`, Compose Specification only. No `version:` key, no Docker-only extensions, no `network_mode: host`, no `privileged`.
- **Named volumes** for the database and data (`pgdata`, `appdata`), not bind mounts. This avoids Windows path translation, rootless-Podman UID mapping and SELinux relabelling.
- Ports bind to `127.0.0.1` (`"127.0.0.1:5432:5432"`) so the DB is never exposed on the LAN.
- Images use fully qualified names (`docker.io/library/postgres:18.6-alpine`), because Podman doesn't assume Docker Hub.
- Health checks use `pg_isready`. `depends_on: condition: service_healthy`.
- The app image runs as a non-root user (UID 1654, the `app` user of the .NET images) and writes only to `/data`.

## Cross-platform rules (enforced in review and by `compat.yml`)

| Risk | Rule |
|---|---|
| Line endings | `.gitattributes` forces LF (`*.ps1`, `*.cmd` CRLF). `.editorconfig` matches. Don't change `core.autocrlf` guidance per machine; the attributes file wins |
| Path separators | `Path.Combine` / `path.join`, never string concatenation with `\` or `/` |
| Case sensitivity | Import paths must match file name casing exactly. ESLint `import/no-unresolved` with case sensitivity + Linux CI catch mistakes. File names: `kebab-case.ts`, components `PascalCase.tsx` |
| Scripts | npm scripts and `dotnet` commands only. No bash-only or PowerShell-only project scripts. If one is unavoidable, provide a Node (`.mjs`) script |
| Env vars in scripts | Cross-platform by design (`process.env` in Node scripts). No `VAR=x cmd` syntax in `package.json` |
| Ports | 5080 API, 5173 Vite, 8080 container app, 5432 DB. Override via env if they're taken |
| Docker socket for Testcontainers | Docker Desktop: works. Podman: set `DOCKER_HOST` to the Podman socket and `TESTCONTAINERS_RYUK_DISABLED=true` if Ryuk fails under rootless Podman ([troubleshooting](runbooks.md#testcontainers-cannot-reach-docker)) |

## Everyday commands

```bash
dotnet test tests/Keemese.UnitTests
dotnet test tests/Keemese.IntegrationTests
npm run lint --prefix web
npm run typecheck --prefix web
npm test --prefix web
npm run e2e --prefix web          # needs the stack running (compose --profile app)
npm run api:types --prefix web    # regenerate the API types from a running API
```
