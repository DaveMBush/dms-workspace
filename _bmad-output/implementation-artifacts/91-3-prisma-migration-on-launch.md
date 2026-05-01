# Story 91.3: Automatic Prisma Migration on App Launch

Status: In Progress

## Story

As Dave,
I want the packaged Electron app to automatically run `prisma migrate deploy` against the
user-data SQLite database before starting the Fastify server,
So that users who install a new version always have the correct database schema without any
manual migration step.

## Acceptance Criteria

1. **Given** the app is launched for the first time (no database file exists yet),
   **When** the Electron main process runs the migration step,
   **Then** a fresh SQLite database is created in `app.getPath('userData')` and all
   migrations are applied before the Fastify server forks.

2. **Given** the app is launched after an upgrade (existing database, older schema),
   **When** the migration step runs,
   **Then** only the pending migrations are applied (idempotent) and the server starts
   with the updated schema.

3. **Given** the migration step uses `prisma migrate deploy`,
   **When** it runs inside the packaged app (no `node_modules/.bin/prisma` on PATH),
   **Then** the migration is invoked via the Prisma CLI binary resolved relative to
   `process.resourcesPath` (placed there by the electron-builder `extraResources` config
   from Story 91.2).

4. **Given** migration fails for any reason (corrupt DB, missing migration files, etc.),
   **When** the failure is caught in the Electron main process,
   **Then** the app displays a user-facing error dialog via `dialog.showErrorBox` and
   exits with a non-zero code rather than attempting to launch with a potentially corrupt
   database.

5. **Given** `pnpm all` runs after this story,
   **Then** all tests pass including unit tests for the migration helper.

## Tasks / Subtasks

- [x] Task 1: Implement `runMigrations` helper in `apps/electron/src/`
  - [x] Create `apps/electron/src/utils/run-migrations.ts`
  - [x] The function must:
    - Resolve the database path: `path.join(app.getPath('userData'), 'dms.db')`
    - Set `DATABASE_URL = file:<dbPath>` in `process.env`
    - Resolve the Prisma CLI path from `process.resourcesPath` (packaged) or
      `node_modules/.bin/prisma` (development)
    - Resolve the schema/migration path from `process.resourcesPath` (packaged) or
      `prisma/schema.prisma` (development)
    - Spawn `prisma migrate deploy --schema=<schemaPath>` as a child process
    - Await completion; reject on non-zero exit code

- [x] Task 2: Write unit tests for `runMigrations`
  - [x] Mock `app.getPath`, `process.resourcesPath`, and `child_process.spawn`
  - [x] Test: success path (exit code 0) → resolves
  - [x] Test: failure path (exit code 1) → rejects with error message
  - [x] Test: development vs packaged path resolution

- [x] Task 3: Integrate `runMigrations` into `apps/electron/src/main.ts`
  - [x] Call `await runMigrations()` before the server fork
  - [x] Wrap in try/catch; on error: `dialog.showErrorBox(...)` then `app.exit(1)`

- [x] Task 4: Update `apps/electron/src/main.ts` to set `DATABASE_URL` before forking
  - [x] After `runMigrations` resolves, ensure `process.env['DATABASE_URL']` is set
        to the user-data DB path before the `fork(serverPath, ...)` call

- [ ] Task 5: Run `pnpm all` — confirm all tests pass

## Dev Notes

### Development vs Packaged Path Detection

```typescript
const isPacked = app.isPackaged;

function resolvePrismaCliPath(): string {
  if (isPacked) {
    // electron-builder places extraResources in process.resourcesPath
    return path.join(process.resourcesPath, 'prisma-cli', 'prisma');
  }
  // Development: use the local node_modules binary
  return path.resolve(__dirname, '../../../../node_modules/.bin/prisma');
}

function resolveMigrationSchemaPath(): string {
  if (isPacked) {
    return path.join(process.resourcesPath, 'schema.prisma');
  }
  return path.resolve(__dirname, '../../../../prisma/schema.prisma');
}
```

Adjust paths based on the electron-builder `extraResources` config from Story 91.2.

### Prisma Binary Bundling

`prisma migrate deploy` requires the Prisma CLI binary. In the packaged app, this must be
available without `node_modules`. Options:
1. Bundle `@prisma/cli` as an `extraResource` (the compiled binary, not the full npm package)
2. Use `prisma` as a regular (non-dev) dependency so it is included in the app bundle

The simplest approach for this repo is to move `prisma` from `devDependencies` to
`dependencies` in the workspace root, which causes electron-builder to include it in the
asar bundle. Consult Story 91.1 Dev Notes for the agreed approach.

### Error Dialog Example

```typescript
import { app, dialog } from 'electron';

try {
  await runMigrations();
} catch (err) {
  dialog.showErrorBox(
    'Database Migration Failed',
    `Could not update the database schema.\n\n${String(err)}\n\nThe application will now exit.`
  );
  app.exit(1);
}
```

## Dev Agent Record

### Implementation Plan

- Task 1: Created `apps/electron/src/utils/run-migrations.ts` exporting `runMigrations()`.
  Uses `app.isPackaged` to branch between dev (node_modules/.bin/prisma) and packaged
  (process.resourcesPath/prisma-cli/prisma) CLI paths and schema paths. Sets
  `process.env['DATABASE_URL']` to `file:<userData>/dms.db` before spawning.
  Spawns `prisma migrate deploy --schema=<schemaPath>`, resolves on exit 0, rejects otherwise.

- Task 2: Created `apps/electron/src/utils/run-migrations.spec.ts` with 7 Vitest tests
  covering: resolve success, exit-1 rejection, DATABASE_URL env setting, dev CLI path,
  packaged CLI path, dev schema path, packaged schema path, and spawn error.

- Task 3 & 4: Updated `apps/electron/src/main.ts` — added `dialog` import, added
  `import { runMigrations }` import, restructured `init()` to call `await runMigrations()`
  first in its own try/catch (showing error dialog and calling `app.exit(1)` on failure),
  then the existing server-start try/catch. `DATABASE_URL` is set by `runMigrations()`
  on `process.env` before return; `startServer` fork uses `...process.env` so it inherits it.

### File List

- `apps/electron/src/utils/run-migrations.ts` (new)
- `apps/electron/src/utils/run-migrations.spec.ts` (new)
- `apps/electron/src/main.ts` (modified)

### Completion Notes

Tasks 1–4 implemented and type-checked with zero TypeScript errors.
Task 5 (pnpm all) pending execution by parent workflow.
