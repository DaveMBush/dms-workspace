# Story 91.1: Research and Document the Electron Packaging Approach

Status: Done

## Story

As a developer,
I want a documented plan that identifies the packaging tool, the bundle strategy, the
database location, and the per-platform output targets,
So that Stories 91.2–91.4 each have an unambiguous implementation target.

## Acceptance Criteria

1. **Given** the current `apps/electron` project (Epic 77 + Epic 83 baseline),
   **When** the developer reads `apps/electron/README.md`, `apps/electron/project.json`,
   and relevant electron-builder documentation,
   **Then** Dev Notes document which tool is selected and why.

2. **Given** the existing Nx build pipeline,
   **When** the developer inspects how `dist/apps/server/main.js` and
   `dist/apps/dms-material/browser` are produced,
   **Then** Dev Notes describe exactly which dist artefacts must be bundled into the asar
   and which must remain outside (the SQLite `.db` file must live in the user-data directory).

3. **Given** platform-specific install destinations (Linux `~/.config`, macOS
   `~/Library/Application Support`, Windows `%APPDATA%`),
   **When** the developer maps the database path to the user-data directory,
   **Then** Dev Notes specify the `app.getPath('userData')` pattern and how
   `DATABASE_URL` will be set at runtime.

4. **Given** the Prisma migration requirement,
   **When** the developer considers the migration timing,
   **Then** Dev Notes describe whether migration runs in the Electron main process before
   the Fastify server forks, or as a startup step in the server bundle, and how to invoke
   `prisma migrate deploy` in a packaged (no-dev-dep) context.

5. **Given** the investigation is complete and no production code is changed,
   **When** `pnpm all` runs,
   **Then** all tests pass unchanged.

## Tasks / Subtasks

- [x] Task 1: Read existing Electron app docs and code
  - [x] Read `apps/electron/README.md` completely
  - [x] Read `apps/electron/project.json` build/start targets
  - [x] Read `apps/electron/src/main.ts` to understand the current startup sequence
        (port finding → server fork → health check → BrowserWindow)
  - [x] Read `apps/server/src/main.ts` to understand how it serves static Angular assets

- [x] Task 2: Evaluate packaging tools
  - [x] Compare `electron-builder` vs `@electron-forge/cli`
  - [x] Prefer `electron-builder` if it supports Nx's build output structure naturally
  - [x] Document the chosen tool and rationale in Dev Notes

- [x] Task 3: Determine asar bundle contents
  - [x] Identify which files go inside the asar (Electron main/preload scripts,
        Fastify server bundle, Angular browser build)
  - [x] Identify which files must be outside the asar (SQLite `.db` file, Prisma
        migration files, any write-able resources)

- [x] Task 4: Design the database path strategy
  - [x] Determine the `userData` path via `app.getPath('userData')`
  - [x] Design how `DATABASE_URL` is set before the server forks
  - [x] Consider first-launch DB creation (copy seed DB from resources?) vs create-on-migrate

- [x] Task 5: Design the Prisma migration strategy
  - [x] Decide timing: Electron main process runs migration before forking the server
  - [x] Determine how `prisma migrate deploy` is invoked without `node_modules/.bin/prisma`
        (use the bundled Prisma binary path relative to `process.resourcesPath`)
  - [x] Document in Dev Notes

- [x] Task 6: Confirm `pnpm all` passes (no code changes)

## Dev Notes

### Key Files to Read

- `apps/electron/src/main.ts` — startup sequence
- `apps/electron/project.json` — build targets (currently: `build`, `start`, `test`)
- `apps/electron/README.md` — architecture description
- `apps/server/src/main.ts` — how Fastify serves Angular static files
- `prisma/schema.prisma` — to understand migration file locations

### Expected Packaging Tool: electron-builder

`electron-builder` is the expected choice because:
1. Wide Nx community adoption
2. Supports asar bundling, auto-updater, and all three target platforms natively
3. Does not require a separate boilerplate (`@electron-forge` requires migrating the project
   structure; `electron-builder` can be bolted onto the existing setup)

### Expected Asar Contents

Inside asar:
- `dist/apps/electron/main.js` (compiled Electron main process)
- `dist/apps/electron/preload.js` (compiled preload script)
- `dist/apps/server/` (compiled Fastify server — the entire directory)
- `dist/apps/dms-material/browser/` (compiled Angular app)

Outside asar (in resources/):
- Prisma migration files (`prisma/migrations/`)
- Prisma schema (`prisma/schema.prisma`)
- Prisma query engine binary

Database file: created fresh in `app.getPath('userData')` on first launch.

### Expected `DATABASE_URL` Strategy

```typescript
// In Electron main process, before forking the server:
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'dms.db');
process.env['DATABASE_URL'] = `file:${dbPath}`;
```

This env var is inherited by the forked server process, which passes it to Prisma.
