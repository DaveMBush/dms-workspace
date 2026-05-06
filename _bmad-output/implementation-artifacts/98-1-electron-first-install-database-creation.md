# Story 98.1: First-Install Database Creation at `~/.dms/dms.db`

Status: Approved

## Story

As Dave (the investor),
I want the Electron app to create `~/.dms/dms.db` (Linux/macOS) or
`C:\Users\<USERNAME>\.dms\dms.db` (Windows) on first launch if it does not yet exist,
So that I can install the app and have it work immediately without any manual database
setup.

## Acceptance Criteria

1. **Given** a clean machine where `~/.dms/dms.db` does not exist,
   **When** the packaged Electron app is launched for the first time,
   **Then** the Electron main process creates the `~/.dms/` directory (mode `0o700` on
   POSIX) if missing and creates an empty SQLite file at `~/.dms/dms.db`.

2. **Given** the database path is resolved cross-platform,
   **When** the path is computed,
   **Then** it uses Node's `os.homedir()` joined with `.dms/dms.db` (this resolves
   correctly to `C:\Users\<USERNAME>\.dms\dms.db` on Windows without per-platform
   branching).

3. **Given** the database file already exists at the path,
   **When** the app is launched,
   **Then** the main process leaves the existing file untouched and proceeds to the
   migration step (Story 98.2).

4. **Given** the database path is established,
   **When** the Electron main process forks the Fastify server,
   **Then** it sets `process.env['DATABASE_URL'] = `file:${dbPath}`` so the forked server
   process inherits the correct location.

5. **Given** TDD ordering,
   **When** the unit tests for the path-resolution and create-if-missing helpers are
   written,
   **Then** they fail before the implementation exists and pass after, and `pnpm all`
   passes.

## Tasks / Subtasks

- [ ] Task 1: Write failing unit tests for the path-resolution helper (AC: 2, 5)
  - [ ] Add a unit test file alongside the new helper (e.g.
        `apps/electron/src/main/db-path.spec.ts`) that asserts the resolved path equals
        `path.join(os.homedir(), '.dms', 'dms.db')`
  - [ ] Cover POSIX path resolution by mocking `os.homedir()` to return `/home/dave`
        and asserting the result is `/home/dave/.dms/dms.db`
  - [ ] Cover Windows path resolution by mocking `os.homedir()` to return
        `C:\\Users\\dave` and asserting the result is `C:\\Users\\dave\\.dms\\dms.db`
        (use `path.win32.join` in the test or mock `path` to simulate Windows)
  - [ ] Confirm tests FAIL before the helper is implemented (red phase)

- [ ] Task 2: Write failing unit tests for the create-if-missing helper (AC: 1, 3, 5)
  - [ ] Test that when `~/.dms/dms.db` does NOT exist, the helper creates the directory
        with mode `0o700` (POSIX) and creates an empty file at the path
  - [ ] Test that when `~/.dms/dms.db` DOES exist, the helper leaves it untouched
        (file size and mtime unchanged)
  - [ ] Test that the directory is created with the correct mode on POSIX (skip the
        mode assertion on Windows)
  - [ ] Use a temp directory (e.g. `os.tmpdir()` + a unique subdir) as a stand-in for
        `os.homedir()` so tests do not touch the real `~/.dms`
  - [ ] Confirm tests FAIL before the helper is implemented (red phase)

- [ ] Task 3: Implement the path-resolution helper (AC: 2)
  - [ ] Create the helper (e.g. `apps/electron/src/main/db-path.ts`) exporting a
        function such as `resolveDbPath(): string` that returns
        `path.join(os.homedir(), '.dms', 'dms.db')`
  - [ ] Verify Task 1 tests now pass (green phase)

- [ ] Task 4: Implement the create-if-missing helper (AC: 1, 3)
  - [ ] In the same module (or an adjacent one such as
        `apps/electron/src/main/ensure-db-file.ts`), export a function such as
        `ensureDbFile(dbPath: string): void` that:
    - Computes the parent directory via `path.dirname(dbPath)`
    - Creates the directory if missing using `fs.mkdirSync(dir, { recursive: true,
      mode: 0o700 })`
    - On POSIX only, calls `fs.chmodSync(dir, 0o700)` if the directory already existed
      (so an existing world-readable directory is tightened — optional, document
      decision in Dev Notes)
    - Creates the empty file if missing using `fs.closeSync(fs.openSync(dbPath, 'a'))`
      (or `fs.writeFileSync(dbPath, '', { flag: 'a' })`) — must NOT truncate an
      existing file
  - [ ] Verify Task 2 tests now pass (green phase)

- [ ] Task 5: Wire the helpers into the Electron main process (AC: 1, 3, 4)
  - [ ] In `apps/electron/src/main.ts` (or whichever file boots the main process and
        forks the Fastify server), call `resolveDbPath()` and then `ensureDbFile(dbPath)`
        BEFORE the server fork
  - [ ] Set `process.env['DATABASE_URL'] = ``file:${dbPath}``` BEFORE the server fork
        so the forked process inherits it
  - [ ] Confirm the existing dev/electron flow still boots locally (manual sanity
        check) — DO NOT introduce regressions in the existing main-process startup
        sequence

- [ ] Task 6: Quality gates (AC: 5)
  - [ ] `pnpm all` passes
  - [ ] `pnpm format` passes

## Dev Notes

### Architecture Compliance

- This story touches only `apps/electron/` main-process source. It does NOT modify the
  Fastify server, the Angular frontend, or any Prisma schema.
- The DB path convention is `~/.dms/dms.db` on every platform — computed via
  `os.homedir()` joined with `.dms/dms.db`. This intentionally REPLACES the
  `userData`-based path that was researched in Epic 91; do not regress to the
  per-platform `app.getPath('userData')` approach.
- The Prisma migration step is OUT OF SCOPE for this story — it is Story 98.2. This
  story only ensures the empty file and the `DATABASE_URL` environment variable exist
  before the server is forked.

### File Locations (probable — confirm by reading current code first)

- Main entry point: `apps/electron/src/main.ts` (or `apps/electron/src/main/index.ts`
  depending on current scaffold) — UPDATE
- New helper module: `apps/electron/src/main/db-path.ts` — NEW
- New helper unit tests: `apps/electron/src/main/db-path.spec.ts` — NEW
- Optional second helper: `apps/electron/src/main/ensure-db-file.ts` — NEW (or co-locate
  in `db-path.ts`)

**CRITICAL:** Before modifying `apps/electron/src/main.ts`, read the file fully and
document in your Dev Agent Notes:

- The current startup sequence (what runs before the server fork today)
- Where the Fastify server fork happens (the `child_process.fork` or equivalent call)
- Any existing environment-variable plumbing — your `DATABASE_URL` line must integrate
  cleanly without breaking other env vars
- Any existing DB-path logic from Epic 91 research that must be replaced (do NOT leave
  dead code behind)

### Library / Framework Requirements

- Use Node's built-in modules only: `os` (for `homedir`), `path` (for `join`/`dirname`),
  `fs` (for `mkdirSync`, `existsSync`, `openSync`, `closeSync`, `chmodSync`).
- Do NOT introduce new dependencies (no `fs-extra`, no `mkdirp`, etc.).
- Use synchronous fs APIs in the main process — startup happens once, before the
  server fork, and async would complicate the ordering guarantee with the fork.

### Cross-Platform Path Resolution

`os.homedir()` returns:

- Linux: `/home/<username>`
- macOS: `/Users/<username>`
- Windows: `C:\Users\<USERNAME>`

`path.join(os.homedir(), '.dms', 'dms.db')` produces the correct separator on each
platform automatically — no `process.platform` branching is required.

### Directory Mode

- On POSIX, the directory must be created with mode `0o700` (owner-only rwx) because
  the SQLite file may eventually contain financial data.
- On Windows, `mode` is largely ignored by `fs.mkdirSync`; that is acceptable — no
  Windows-specific ACL work is required for this story.

### Environment Variable: `DATABASE_URL`

Prisma reads `DATABASE_URL` to locate the SQLite file. The format is `file:` followed
by the absolute path:

```ts
process.env['DATABASE_URL'] = `file:${dbPath}`;
```

This MUST be set on `process.env` of the Electron main process BEFORE
`child_process.fork(serverEntry, ...)` so the forked Fastify server inherits it. If
the existing main-process code already sets `DATABASE_URL` to a different value
(e.g. from Epic 91 research), REPLACE it — do not double-set.

### TDD Ordering (AC 5)

Write the unit tests FIRST, run them, and confirm they fail with a clear "function not
defined" / "module not found" / assertion error. THEN implement the helpers and
re-run to confirm green. Record both runs (or at least the final green run) in the
Dev Agent Record.

### Test Strategy

- Unit tests use Vitest (the workspace standard — confirm by checking other
  `apps/electron/**/*.spec.ts` files if any exist).
- The `ensureDbFile` test must NOT touch the real `~/.dms` directory. Use
  `os.tmpdir()` + a unique subdir per test, and clean up in `afterEach`.
- No new E2E test is required in this story — the smoke-test coverage is Story 98.4.

### Out of Scope (do NOT do in this story)

- Prisma migration application — Story 98.2
- Per-platform Electron build targets — Story 98.3
- Packaged-app smoke test — Story 98.4
- Any change to the Fastify server's startup or DB connection code (it already reads
  `DATABASE_URL`)

### What Must Be Preserved

- The existing Electron main-process boot sequence (window creation, IPC setup,
  server fork) must continue to work unchanged for local dev (`pnpm electron:serve`
  or whichever script the workspace uses).
- Any existing `process.env` configuration set before the server fork must remain;
  only the `DATABASE_URL` value should change (or be added if not present).

## Project Context

- Project root: `/home/dave/code/dms-workspace`
- Architecture reference: `_bmad-output/planning-artifacts/architecture.md`
- Epic source: `_bmad-output/planning-artifacts/epics-2026-05-05.md` → Epic 98 →
  Story 98.1
- Quality gates: `pnpm all` (lint + unit + format check) and `pnpm format`
- Replaces the `userData`-based DB path researched in Epic 91 with the
  `~/.dms/dms.db` convention.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
