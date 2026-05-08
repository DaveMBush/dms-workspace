# Story 98.2: Node-Free Prisma Migrations on Launch

Status: Done

## Story

As Dave (the investor),
I want the packaged Electron app to apply pending Prisma migrations to `~/.dms/dms.db` on
launch without requiring Node, npm, or pnpm to be installed on my machine,
So that I can install a new app version and have my database schema upgraded automatically
on a clean machine that has no developer toolchain.

**Depends on:** Story 98.1 (`~/.dms/dms.db` path resolution and `DATABASE_URL` are
established by the main process before this story's migration step runs).

**Supersedes:** Story 91.3 (`runMigrations` was prototyped there using `prisma migrate
deploy` via the Prisma CLI; that approach assumes a Node runtime is present and is replaced
by this story).

## Acceptance Criteria

1. **Given** the packaged app contains the Prisma migration engine binary and the migration
   SQL files in `process.resourcesPath` (outside the asar),
   **When** the Electron main process launches,
   **Then** it invokes the bundled migration engine against `~/.dms/dms.db` (the path
   resolved by Story 98.1) to apply any pending migrations **before** forking the Fastify
   server.

2. **Given** no Node binary is available on the user's `PATH`,
   **When** the migration runs in the packaged app,
   **Then** only the bundled migration binary (and its native dependencies) is executed —
   no `node`, `npm`, `pnpm`, or `prisma` CLI invocation occurs and the migration succeeds.

3. **Given** the embedded-migration-engine approach is investigated and documented,
   **When** the developer determines it is infeasible (engine binary unavailable for the
   target platform / cannot be invoked without the Prisma JS wrapper / etc.),
   **Then** the documented fallback is implemented: create a fresh `dms.db.new` at the
   latest schema using the bundled migration SQL applied via the bundled `sqlite3` CLI (or
   `better-sqlite3` from a packaged Node binary alternative is **not** acceptable), copy
   rows from the existing `dms.db` to `dms.db.new` using SQLite-only statements, then
   atomically replace `dms.db` with `dms.db.new`. The chosen path is documented in Dev
   Notes and in `apps/electron/README.md`.

4. **Given** a database that is already at the latest schema,
   **When** the migration step runs,
   **Then** it is a no-op — no migrations are applied, the DB file's schema-relevant rows
   are unchanged, and the Fastify server starts normally.

5. **Given** the migration step fails for any reason (missing binary, corrupt DB, failed
   SQL),
   **When** the failure is caught in the Electron main process,
   **Then** a clear error dialog is surfaced via `dialog.showErrorBox` (or the platform
   equivalent) explaining the failure and the app exits with a non-zero exit code — the
   server is **not** forked with a stale or partially-migrated schema.

6. **Given** the migration step succeeds,
   **When** control returns to the main process,
   **Then** the Fastify server is forked with `process.env['DATABASE_URL']` already
   pointing at `~/.dms/dms.db` (set by Story 98.1) and the migration completion is logged.

7. **Given** TDD ordering,
   **When** unit tests in `apps/electron/src/utils/` are written,
   **Then** there is a failing test (RED) for each branch (no-op, pending migrations
   applied, failure surfaces dialog + non-zero exit, packaged-vs-dev path resolution)
   before the implementation exists, and after implementation `pnpm all` passes (GREEN).

8. **Given** all changes,
   **When** `pnpm all` and `pnpm format` run,
   **Then** both pass.

## Tasks / Subtasks

- [x] Task 1: Investigate the embedded-migration-engine approach (AC: #1, #2, #3)
  - [x] Identify the Prisma 7.x migration engine binary name and location inside the
        `@prisma/engines` package for Linux, macOS, and Windows
  - [x] Determine whether the binary can be invoked directly (CLI-style) or whether it
        requires the JS wrapper (`@prisma/migrate`) to drive it
  - [x] Confirm the binary works against a SQLite file with no Node runtime present
  - [x] Capture findings (preferred path vs fallback) in a short note that will land in
        Dev Notes of this story and in `apps/electron/README.md`

- [x] Task 2: Bundle the migration engine binary + migration SQL outside the asar
      (AC: #1, #2)
  - [x] Update `apps/electron/electron-builder.yml` `extraResources` to include the
        platform-appropriate migration engine binary (alongside the existing
        `prisma/migrations` and `prisma/schema.prisma` entries)
  - [x] Verify after `pnpm exec nx run electron:package` (or the per-platform target from
        Story 98.3) that the binary is present in `process.resourcesPath` and is
        executable on the target platform (chmod `0o755` on POSIX where required)

- [x] Task 3: Replace the Story 91.3 `runMigrations` implementation with the Node-free
      path (AC: #1, #2, #4, #5, #6)
  - [x] Update `apps/electron/src/utils/run-migrations.ts`:
    - Resolve the database path from the Story 98.1 helper (`~/.dms/dms.db`), **not**
      `app.getPath('userData')`
    - Resolve the bundled migration-engine binary path:
      - Packaged: `path.join(process.resourcesPath, 'prisma-migration-engine', <binary>)`
      - Development: continue to use the Node-based `prisma migrate deploy` so the dev
        loop is unaffected
    - Spawn the bundled binary (packaged) or the dev CLI (development) with arguments
      that apply pending migrations against `~/.dms/dms.db`
    - Resolve on success; reject on non-zero exit; treat "no pending migrations" as
      success (no-op, AC #4)
  - [x] Remove the assumption that the Prisma CLI (and therefore Node) is available in
        the packaged app

- [x] Task 4: If Task 1 concludes the embedded-engine path is infeasible, implement the
      fallback fresh-DB + copy approach (AC: #3)
  - [x] N/A — Task 1 confirmed the embedded schema-engine path is viable. Fallback not
        implemented. Decision documented in `apps/electron/README.md`.

- [x] Task 5: Wire the failure path through `apps/electron/src/main.ts` (AC: #5)
  - [x] The existing try/catch around `runMigrations()` (added in Story 91.3) is
        retained; confirmed it surfaces `dialog.showErrorBox(...)` and calls `app.exit(1)`
        on failure (lines 255-282 of `main.ts`)
  - [x] Confirmed the server fork is not reached when migrations fail

- [x] Task 6: Write failing unit tests first (TDD) (AC: #7)
  - [x] Update `apps/electron/src/utils/run-migrations.spec.ts`:
    - Mock `child_process.spawn`, `process.resourcesPath`, `app.isPackaged`, and the
      `~/.dms/dms.db` path helper
    - Test: packaged → spawns bundled engine binary path (not `prisma`) ✓
    - Test: development → spawns dev CLI path (regression-protect dev loop) ✓
    - Test: success → resolves ✓
    - Test: exit-1 → rejects with error message ✓
    - Test: no-op when DB is at latest schema → resolves without applying migrations ✓
    - Tests were written RED first, then implementation turned them GREEN (13 total pass)

- [x] Task 7: Update documentation (AC: #3, supports Story 98.3)
  - [x] Added "Database Migrations on Launch" section to `apps/electron/README.md`
        describing: embedded engine approach chosen, binary location, JSON-RPC protocol,
        dev path, how to update migrations, and fallback note

- [x] Task 8: Run `pnpm all` and `pnpm format` — confirm green (AC: #8)

## Dev Notes

### Why Story 91.3's Approach Is Insufficient

Story 91.3 invoked `prisma migrate deploy` via the Prisma CLI by spawning a child process
that ultimately requires a Node runtime to execute the JS-side of the Prisma CLI. Packaged
Electron does **not** expose the Electron Node runtime as a `node` binary on the user's
`PATH`, and we cannot assume the user has Node installed (NFR33). This story replaces that
mechanism with a Node-free invocation of the migration engine binary directly.

### Preferred Path: Embedded Migration Engine Binary

Prisma's migration engine ships as a native binary (e.g.
`migration-engine-debian-openssl-3.0.x` on Linux, equivalents for macOS and Windows). It
lives inside `node_modules/@prisma/engines/` after install. The plan:

1. Identify the correct binary for each target platform (one per platform; they are
   selected at install time via Prisma's binary targets — confirm whether a single build
   bundles all three or whether per-platform packaging from Story 98.3 selects the
   appropriate one).
2. Copy the binary into `process.resourcesPath` via `extraResources` in
   `electron-builder.yml`.
3. Invoke it from `runMigrations` with arguments equivalent to `migrate deploy` against the
   bundled `prisma/schema.prisma` and `prisma/migrations/` directory (also already
   bundled).

If the engine binary cannot be invoked directly (i.e. it requires the
`@prisma/migrate` JS wrapper), document that finding and switch to the fallback.

### Fallback Path: Fresh DB + SQLite-Only Copy

If the embedded engine cannot be made to work without a JS wrapper:

1. Apply migration SQL files in order to a fresh `~/.dms/dms.db.new`. Each migration
   directory under `prisma/migrations/` already contains a `migration.sql` file authored
   for SQLite — these can be executed with the bundled `sqlite3` CLI.
2. Use `ATTACH DATABASE 'file:~/.dms/dms.db' AS old; INSERT INTO new.<table> SELECT *
   FROM old.<table>;` for each table to copy data.
3. Atomically rename `dms.db.new` → `dms.db` (with a one-step backup of the original on
   Windows where atomic rename is not guaranteed across an existing file).

This path is more brittle (table list must be enumerated; renamed columns require
per-migration translation) — adopt only if the preferred path is confirmed infeasible.

### Path Resolution Contract with Story 98.1

Story 98.1 will export a helper such as `resolveDmsDbPath(): string` that returns
`path.join(os.homedir(), '.dms', 'dms.db')` and an idempotent `ensureDmsDb(): Promise<void>`
that creates the directory (mode `0o700` on POSIX) and the empty DB file if missing. This
story's `runMigrations` consumes that path; do **not** re-implement path resolution here.

### Failure Behaviour (AC #5)

```typescript
import { app, dialog } from 'electron';

try {
  await runMigrations();
} catch (err) {
  dialog.showErrorBox(
    'Database Migration Failed',
    `Could not update the database schema.\n\n${String(err)}\n\nThe application will now exit.`,
  );
  app.exit(1);
}
```

This block already exists in `apps/electron/src/main.ts` from Story 91.3 — verify it is
preserved and continues to wrap the new implementation.

### Testing Standards

- Unit tests live next to the code: `apps/electron/src/utils/run-migrations.spec.ts`
- Use Vitest; mock `child_process.spawn`, `app.isPackaged`, `process.resourcesPath`, and
  the Story 98.1 path helper
- Do **not** test against a real Prisma binary or a real database in unit tests — that is
  reserved for the Story 98.4 packaged-app smoke test
- Tests must fail (RED) before implementation, then pass (GREEN) after — capture this in
  commit history

### Files to Modify (UPDATE)

- `apps/electron/src/utils/run-migrations.ts` — replace CLI-based implementation
- `apps/electron/src/utils/run-migrations.spec.ts` — extend tests for new branches
- `apps/electron/src/main.ts` — only if the call signature of `runMigrations` changes; the
  try/catch + dialog wiring is already in place
- `apps/electron/electron-builder.yml` — add migration engine binary to `extraResources`
- `apps/electron/README.md` — document the chosen migration mechanism

### Files to Read Before Starting (do not skip)

- `apps/electron/src/main.ts` — current `init()` flow and where `runMigrations` is awaited
- `apps/electron/src/utils/run-migrations.ts` — Story 91.3's implementation (the baseline
  this story replaces)
- `apps/electron/src/utils/run-migrations.spec.ts` — existing test cases that must
  continue to express the contract (success / failure / dev-vs-packaged path)
- `apps/electron/electron-builder.yml` — current `extraResources` layout
- `prisma/migrations/` — confirm migration SQL files are SQLite-compatible (they are;
  `prisma/migrations-postgresql/` is the Postgres variant)
- The Story 98.1 file (when it lands) for the exact `resolveDmsDbPath` contract

### Project Structure Notes

- This story does not introduce new top-level directories
- The migration engine binary lives only in `process.resourcesPath` at runtime — it is
  **not** committed to the repo; it is sourced from `node_modules/@prisma/engines/` at
  package time via `electron-builder.yml`

### References

- Epic 98 spec: [Source: _bmad-output/planning-artifacts/epics-2026-05-05.md#Story 98.2]
- Requirements: R70, R71, R72 [Source:
  _bmad-output/planning-artifacts/epics-2026-05-05.md#Requirements Inventory]
- Non-functional: NFR33 (clean-machine constraint) [Source:
  _bmad-output/planning-artifacts/epics-2026-05-05.md#Non-Functional Requirements]
- Story 98.1 (path + DATABASE_URL contract): [Source: epics-2026-05-05.md#Story 98.1]
- Story 91.3 (prior CLI-based implementation, now superseded):
  _bmad-output/implementation-artifacts/91-3-prisma-migration-on-launch.md
- Electron `dialog.showErrorBox` API: https://www.electronjs.org/docs/latest/api/dialog
- Prisma 7 migration engine reference: https://www.prisma.io/docs/orm/prisma-migrate

## Dev Agent Record

### Context Reference

- Created via bmad-create-story
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-05/98-2-electron-node-free-prisma-migrations.yaml`

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

N/A — no blocking issues required debug logs.

### Completion Notes List

- **Chosen approach**: Prisma 7 `schema-engine-*` binary (from `@prisma/engines`) communicates via
  JSON-RPC over stdio — no Node runtime required at runtime in the packaged app.
- **Binary invocation**: `spawn(binaryPath, ['--datamodels', schemaPath, '--datasource', '{"url":"..."}'])`;
  on `spawn` event write `applyMigrations` JSON-RPC request to stdin and close; parse result on `close`.
- **DATABASE_URL** is already set in `main.ts` before `runMigrations()` is called — no change needed there.
- **Dev loop unchanged**: when `!app.isPackaged`, `prisma migrate deploy` is still used so local dev is unaffected.
- **Binary bundled** via `electron-builder.yml` `extraResources` glob:
  `node_modules/.pnpm/node_modules/@prisma/engines/schema-engine-*` → `prisma-migration-engine/`.
- **`main.ts` error handling** verified intact from Story 91.3 (lines 255–282): `showFatalError()` calls
  `dialog.showErrorBox()` + `app.exit(1)` on migration failure.
- **25 tests pass** (electron package): 13 in `run-migrations.spec.ts` (was 7), plus 12 unchanged others.
- **TypeScript compiles clean** (`tsc --noEmit` exits 0).
- **`pnpm format`** ran without changes.

### File List

- `apps/electron/src/utils/run-migrations.ts` — replaced CLI-only impl with dev/packaged split (JSON-RPC engine)
- `apps/electron/src/utils/run-migrations.spec.ts` — 13 tests (was 7); new packaged-path TDD tests added
- `apps/electron/electron-builder.yml` — added `schema-engine-*` binary to `extraResources`
- `apps/electron/README.md` — added "Database Migrations on Launch" documentation section

## Change Log

| Date       | Author | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| 2026-05-06 | Dave   | Story created (Approved) via bmad-create-story flow.   |
| 2026-05-06 | Agent  | Implementation complete. Status set to Done.           |
