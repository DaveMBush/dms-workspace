# Electron Packaging Research

> **Story 91.1** — Research and Document the Electron Packaging Approach
> This document is the primary deliverable. It informs Stories 91.2–91.4.

---

## 1. Selected Packaging Tool: `electron-builder`

### Decision

`electron-builder` is selected over `@electron-forge/cli`.

### Rationale

| Criterion               | `electron-builder`                                                      | `@electron-forge/cli`                                                        |
| ----------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Nx compatibility        | Drop-in: reads existing `dist/` output; no project restructure required | Requires migrating to Forge's own build pipeline (conflicts with Nx targets) |
| asar support            | Native; configurable `files` globs                                      | Native                                                                       |
| Auto-updater            | `electron-updater` companion package                                    | Built-in but tied to Forge workflow                                          |
| Cross-platform targets  | deb, rpm, AppImage, dmg, pkg, nsis, portable                            | Same, but more boilerplate                                                   |
| Community / Nx adoption | Dominant pattern in Nx + Electron monorepos                             | Less common with Nx                                                          |
| Configuration           | Single `electron-builder.yml` alongside `project.json`                  | `forge.config.js` inside app directory                                       |

`electron-builder` can be bolted onto the existing setup by adding a `package` Nx target that
runs `electron-builder --config electron-builder.yml` after the existing `build` target. No
changes to `project.json`'s `build`, `start`, or `test` targets are required.

---

## 2. Asar Bundle Contents

The asar is an append-only virtual file-system embedded inside the packaged app. Write-able
resources and files that must survive app upgrades must live **outside** the asar.

### Inside the asar

| Artefact                | Source path                                          | Notes                                |
| ----------------------- | ---------------------------------------------------- | ------------------------------------ |
| Electron main process   | `apps/electron/dist/main.js`                         | Compiled by `electron:build` (`tsc`) |
| Electron preload script | `apps/electron/dist/preload.js`                      | Compiled by `electron:build` (`tsc`) |
| Fastify server bundle   | `dist/apps/server/` (entire directory)               | Compiled by `server:build`           |
| Angular browser app     | `dist/apps/dms-material/browser/` (entire directory) | Compiled by `dms-material:build`     |

### Outside the asar (in `resources/`)

| Artefact                   | Destination in package                           | Reason                                             |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Prisma migration files     | `resources/prisma/migrations/`                   | `prisma migrate deploy` reads SQL files at runtime |
| Prisma schema              | `resources/prisma/schema.prisma`                 | Required by `migrate deploy`                       |
| Prisma query engine binary | `resources/` (auto-placed by `electron-builder`) | Native binary; must not be inside asar             |
| SQLite database file       | `app.getPath('userData')/dms.db`                 | Created/written at runtime; user data              |

> **Key constraint**: Files inside the asar are read-only. The SQLite `.db` file is created fresh
> in `userData` on first launch via `prisma migrate deploy` and must never be placed inside the
> asar.

---

## 3. `DATABASE_URL` Strategy

### Platform-specific `userData` paths

| Platform | `app.getPath('userData')` default          |
| -------- | ------------------------------------------ |
| Linux    | `~/.config/{app-name}`                     |
| macOS    | `~/Library/Application Support/{app-name}` |
| Windows  | `%APPDATA%\{app-name}`                     |

### Implementation pattern

The `DATABASE_URL` environment variable must be set in the Electron **main process** before the
Fastify server is forked, so the forked child process inherits it automatically.

```typescript
// In apps/electron/src/main.ts — init() function, before startServer()
import { app } from 'electron';
import path from 'path';

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'dms.db');
process.env['DATABASE_URL'] = `file:${dbPath}`;
```

The existing `startServer()` in `main.ts` already spreads `process.env` into the fork env:

```typescript
serverProcess = fork(serverPath, [], {
  env: { ...process.env, PORT: String(port) },
  // ...
});
```

Because `DATABASE_URL` is set on `process.env` before the fork, the server process inherits it
without any additional changes. The server's `initializeDatabaseUrl()` in
`apps/server/src/utils/aws-config.ts` already reads `process.env.DATABASE_URL` as the local
dev/non-AWS fallback path, so no server-side changes are needed.

### First-launch database creation

On first launch (no `dms.db` in `userData`) `prisma migrate deploy` creates the database file and
applies all migrations. No seed DB copy from resources is needed — the schema migrations are
sufficient to produce a working empty database.

---

## 4. Prisma Migration Strategy

### Timing

Migrations run in the **Electron main process**, before `startServer()` forks the Fastify
process. This guarantees that the database schema is current before any API requests are served.

```text
init()
  ├─ findAvailablePort()
  ├─ set DATABASE_URL = userData/dms.db      ← new step (Story 91.2)
  ├─ runMigrations()                          ← new step (Story 91.3)
  │    └─ prisma migrate deploy
  ├─ startServer(port)
  ├─ healthCheck(port)
  └─ app.whenReady() → createWindow(port)
```

### Invoking `prisma migrate deploy` without `node_modules/.bin/prisma`

In a packaged app, `node_modules` is not present. `electron-builder` can be configured to include
the Prisma CLI binary in `resources/`. The migration invocation uses `child_process.execFile` (or
`spawnSync`) with the bundled binary path:

```typescript
import { execFileSync } from 'child_process';
import path from 'path';

function runMigrations(): void {
  // process.resourcesPath = the resources/ directory outside the asar
  const prismaBin = path.join(process.resourcesPath, 'prisma');
  const schemaPath = path.join(process.resourcesPath, 'prisma', 'schema.prisma');

  execFileSync(prismaBin, ['migrate', 'deploy', `--schema=${schemaPath}`], {
    env: {
      ...process.env,
      // Ensure the query engine binary is discoverable
      PRISMA_QUERY_ENGINE_BINARY: path.join(process.resourcesPath, 'query_engine'),
    },
    stdio: 'inherit',
  });
}
```

> **Note**: The exact binary names (`prisma`, `query_engine`) are platform-dependent.
> `electron-builder` configuration in Story 91.3 will pin the correct binary names and paths.

### Migration file location in `electron-builder` config

```yaml
# electron-builder.yml (to be created in Story 91.2)
extraResources:
  - from: prisma/migrations
    to: prisma/migrations
  - from: prisma/schema.prisma
    to: prisma/schema.prisma
  - from: node_modules/.prisma/client/libquery_engine-*
    to: ./
    filter:
      - '**'
```

---

## 5. Per-Platform Output Targets

| Platform | Target format               | Notes                                                          |
| -------- | --------------------------- | -------------------------------------------------------------- |
| Linux    | `AppImage` (primary), `deb` | AppImage is self-contained; deb for Debian/Ubuntu distribution |
| macOS    | `dmg`                       | Standard macOS install experience                              |
| Windows  | `nsis`                      | Standard Windows installer                                     |

All three targets are supported natively by `electron-builder` without additional plugins.

---

## 6. Current Build Gap (baseline from Epic 83)

As confirmed in `apps/electron/README.md`:

> _"The repository does not currently include `electron-builder`, `electron-packager`, or
> equivalent packaging configuration. Today, `electron:build` is a compile-only build, not a
> true distributable packaging step."_

The existing Nx targets (`build`, `start`, `test`) are **not modified** by this story. Story 91.2
will add the `package` target and `electron-builder.yml` configuration.

---

## 7. `pnpm all` Verification

No production code was changed as part of this research story. The `pnpm all` command (lint,
build, test) passes without modification — the findings above inform implementation in Stories
91.2–91.4 only.
