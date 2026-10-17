# ADR-0012: Toolchain pins

Status: Accepted (2026-10-17)

## Context (checked 2026-10-17)
- The machine has .NET SDK **10.0.402** with runtime 10.0.13, which is the latest patch (released 2026-10-13). .NET 10 is LTS.
- Node.js schedule: **24 enters Maintenance LTS on 2026-10-20 (EOL 2028-04-30). 26 becomes Active LTS on 2026-10-28.** Node 24.21 is installed. Corepack is no longer bundled with newer Node lines.
- `typescript@latest` is **7.0.2** (the native Go port), but `typescript-eslint` 8.71 supports only `typescript >=4.8.4 <6.1.0`.

## Decision
| Tool | Pin | Mechanism |
|---|---|---|
| .NET SDK | `10.0.400`, `rollForward: latestPatch` (any 10.0.4xx) | `global.json` |
| Node.js | **24 LTS** (`>=24.11 <25`) | `.nvmrc` = `24`, `engines.node` in `web/package.json` |
| Package manager | **npm** (bundled with Node), exact versions in `package-lock.json` | `packageManager: "npm@11.x"` field, `npm ci` in CI |
| TypeScript | **~6.0** | devDependency; upgrade to 7 when `typescript-eslint` supports it |
| NuGet | Central Package Management (`Directory.Packages.props`), lock files (`packages.lock.json`) | `RestorePackagesWithLockFile` |

Node 24: it is installed, supported until April 2028, and every chosen package supports it (Vite 8 needs `^20.19 || >=22.12`). We move to Node 26 through a small `chore/` branch **after** 2026-10-28, once CI is green on 26 — a one-line change to `.nvmrc`, `engines` and the CI matrix.

## Alternatives
- pnpm: faster and stricter, but needs Corepack or a separate install on each OS. npm is good enough here and adds nothing to install.
- TypeScript 7 now: would force dropping type-aware linting.

## Consequences
- Contributors install .NET SDK 10.0.4xx, Node 24 and Docker or Podman. That's all ([local setup](../operations/local-setup.md)).
- Dependabot groups minor and patch updates weekly. Majors are reviewed one at a time.
