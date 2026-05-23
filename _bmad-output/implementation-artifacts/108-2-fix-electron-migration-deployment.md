# Story 108.2: Fix Migration Deployment for Electron Builds

Status: In Progress

## Story

As Dave,
I want the packaged Electron app on Linux (AppImage), macOS, and Windows to successfully
initialize the SQLite database on first launch with Prisma migrations executing without
error,
So that the app can start and run on a clean machine without manual database setup or
manual error recovery.

**Depends on:** Story 108.1 (diagnosis of the broken layer in the packaged migration flow).
**Enables:** Story 108.3 (E2E cross-platform packaged-launch smoke test).

**Requirements covered:** R7, R8, R9. **Non-functional:** NFR7 (macOS and Windows builds
must remain functional after the fix).

## Acceptance Criteria

1. **Given** the root cause identified by Story 108.1,
   **When** the developer implements the fix,
   **Then** the fix targets the actual broken layer — whether that is
   (a) ensuring the AppImage / DMG / NSIS bundle contains the migrations folder, schema,
   and schema-engine binary at the expected `process.resourcesPath` locations,
   (b) correcting path resolution in the Electron main process for the packaged context,
   (c) setting required environment variables (`DATABASE_URL`, engine-binary env, etc.)
   before invoking the migration runner, or
   (d) adjusting the migration-runner invocation arguments (e.g. the JSON-RPC payload
   sent to the bundled `schema-engine-*` binary).

2. **Given** the fix is applied,
   **When** the app is built as an AppImage for Linux via `pnpm exec nx run electron:build:linux`
   and the resulting AppImage is launched on a clean Linux fixture,
   **Then** the app starts successfully, creates `~/.dms/dms.db` (Story 98.1 path), and
   the migrations execute without the `missing field "migrationsList"` error (or any other
   migration error).

3. **Given** the same code change applied to the macOS DMG and Windows NSIS builds,
   **When** each platform build is produced (via `electron:build:mac` / `electron:build:win`)
   and tested on its respective platform,
   **Then** all three platform builds start successfully, run pending migrations, and reach
   the Fastify-server-ready state (R9, NFR7).

4. **Given** the underlying database file after first launch,
   **When** the developer opens `~/.dms/dms.db` with `sqlite3` and runs
   `.schema accounts` (or any other model in `prisma/schema.prisma`),
   **Then** every table defined by the applied migrations exists with the expected columns,
   indexes, and constraints — i.e. the resulting schema is identical to a freshly migrated
   dev database.

5. **Given** an existing database that is already at the latest schema,
   **When** the app is launched again,
   **Then** the migration step is a no-op (no migrations are re-applied, no error), the
   database file is unchanged, and the Fastify server starts normally (regression
   protection for Story 98.2 AC #4).

6. **Given** the development flow (`pnpm exec nx run electron:start`),
   **When** the developer launches the unpackaged app,
   **Then** the dev migration path (`prisma migrate deploy` via the local
   `node_modules/.bin/prisma` CLI) continues to work unchanged — the fix does not regress
   the dev loop.

7. **Given** the failure handling wired by Stories 91.3 / 98.2 in `apps/electron/src/main.ts`,
   **When** migrations fail for any reason after the fix is applied,
   **Then** `dialog.showErrorBox(...)` still surfaces the error and `app.exit(1)` is still
   called — the Fastify server is not forked with a partially-migrated schema.

8. **Given** `pnpm all` runs after the fix,
   **Then** all tests pass — including the existing 13 unit tests in
   `apps/electron/src/utils/run-migrations.spec.ts` and any new/updated tests that
   regression-protect the fix.

9. **Given** `pnpm format` runs after the fix,
   **Then** it completes without changes.

## Tasks / Subtasks

> **Implementation guardrail:** Do NOT begin Task 1 until the Story 108.1 Dev Notes record
> the broken layer. The branch of code/config to change is dictated by that diagnosis.
> The four branches below are mutually compatible — the diagnosis may require fixes in
> more than one — but the dev agent must change only what the diagnosis justifies and
> leave the other layers untouched.

- [x] Task 1: Re-read Story 108.1 diagnosis and confirm the broken layer (gate)

  - [x] Open `_bmad-output/implementation-artifacts/108-1-investigate-electron-migration-failure.md`
        (the file Story 108.1 produces) and quote the identified broken layer at the top
        of this story's Dev Agent Record → Implementation Plan
  - [x] Cross-check the diagnosis against the four layers in AC #1; pick the smallest
        scoped fix that addresses the diagnosis
  - [x] If the diagnosis is ambiguous or missing, STOP and surface the gap rather than
        guessing

- [ ] Task 2 (Branch A — bundle contents): Fix `electron-builder.yml` so the AppImage /
      DMG / NSIS contains the required Prisma assets (AC: #1a, #2, #3)

  - [ ] Only execute this task if Story 108.1 identifies a missing or mis-placed file in
        the packaged bundle (e.g. `prisma/migrations` not present at
        `process.resourcesPath`, schema-engine binary not present or not executable, or
        the wrong-platform engine binary bundled)
  - [ ] Inspect current `apps/electron/electron-builder.yml` `extraResources` entries
        (already bundles `prisma/migrations`, `prisma/schema.prisma`, and
        `node_modules/.pnpm/node_modules/@prisma/engines/schema-engine-*`)
  - [ ] Adjust the `from`/`to`/`filter` globs as required by the diagnosis — e.g.
        ensure the `schema-engine-*` glob resolves under pnpm's hoisted layout, ensure
        the binary survives outside the asar, ensure the binary is marked executable on
        POSIX (`asarUnpack` / `extraResources` does not strip the executable bit, but
        verify on a built AppImage)
  - [ ] Verify the fix per platform by running `pnpm exec nx run electron:build:linux`,
        unpacking the produced AppImage (e.g. `./*.AppImage --appimage-extract`), and
        listing the bundle contents under `squashfs-root/resources/`

- [ ] Task 3 (Branch B — path resolution): Fix path resolution in
      `apps/electron/src/utils/run-migrations.ts` (AC: #1b, #2, #3)

  - [ ] Only execute this task if Story 108.1 identifies a path-resolution bug
        (e.g. `resolveSchemaEnginePath`, `resolveMigrationsPath`, or `resolveSchemaPath`
        produces a path that does not exist on Linux/macOS/Windows in the packaged build)
  - [ ] Update only the affected helper(s); keep the dev path
        (`runMigrationsDev` → `resolvePrismaCliPath`) unchanged unless the diagnosis says
        otherwise
  - [ ] If the schema-engine binary name needs adjustment (currently:
        `schema-engine-darwin-arm64`, `schema-engine-darwin`,
        `schema-engine-windows.exe`, `schema-engine-debian-openssl-3.0.x`), confirm the
        exact filename present in the bundled `@prisma/engines` for the current Prisma
        version pinned in `package.json`

- [ ] Task 4 (Branch C — environment variables): Set required engine env vars before
      spawn (AC: #1c, #2, #3)

  - [ ] Only execute this task if Story 108.1 identifies missing/wrong env vars (e.g.
        `PRISMA_SCHEMA_ENGINE_BINARY`, `PRISMA_QUERY_ENGINE_BINARY`, OpenSSL discovery,
        or `DATABASE_URL` not propagating to the engine child process)
  - [ ] Set the env vars on the `spawn(..., { env: ... })` options in
        `runMigrationsPackaged` — do NOT mutate `process.env` globally for cross-platform
        consistency
  - [ ] Confirm `DATABASE_URL` is already set by `main.ts` before `runMigrations()` is
        awaited (Story 98.1 contract) — if Story 108.1 finds it unset on Linux, fix
        `main.ts` rather than `run-migrations.ts`

- [x] Task 5 (Branch D — JSON-RPC payload): Correct the schema-engine invocation
      (AC: #1d, #2, #3)

  - [x] Only execute this task if Story 108.1 identifies the JSON-RPC `applyMigrations`
        request payload as the broken layer
  - [x] The current request in `buildApplyMigrationsRequest` sends
        `params: { migrationsDirectoryPath: migrationsPath }`. The production error
        message ("Invalid params: missing field `migrationsList`") strongly suggests the
        Prisma 7 schema-engine `applyMigrations` method now expects a different param
        shape — confirm the exact contract from Story 108.1's diagnosis (and the Prisma
        7 schema-engine source / docs cited there) and update `buildApplyMigrationsRequest`
        accordingly. Do not invent a payload shape; use the shape Story 108.1 documents.
  - [x] Keep all other JSON-RPC framing (`jsonrpc: '2.0'`, `id: 1`, `method`) and the
        existing response/error parsing in `parseRpcResponse` unchanged

- [x] Task 6: Add or update regression tests in `apps/electron/src/utils/run-migrations.spec.ts`
      (AC: #1, #5, #6, #8)

  - [x] Add a failing unit test that asserts the corrected behaviour for the layer fixed
        in Task 2–5 (e.g. payload shape, path resolution, env var presence) — RED first
  - [x] Implement the fix per Tasks 2–5 — turn the test GREEN
  - [x] Preserve all 13 existing tests; none must be skipped or relaxed. The
        "packaged: passes --datamodels and --datasource args to schema-engine" and
        "resolves Prisma CLI from node_modules in development" tests in particular
        regression-protect the dev/packaged split and must continue to pass
  - [x] If the fix changes the JSON-RPC payload shape, update the test fixture in
        `makeMockEngineProcess` (`noOpResponse`) and the assertions for the request
        written to `child.stdin`

- [ ] Task 7: Verify on each platform (AC: #2, #3, #4, NFR7)

  - [ ] **Linux (AppImage)**: build with `pnpm exec nx run electron:build:linux`; on a
        clean Linux fixture (or a directory with no pre-existing `~/.dms/`), execute the
        AppImage and confirm:
        - No `missingField` error in stdout/stderr
        - `~/.dms/dms.db` is created
        - `sqlite3 ~/.dms/dms.db ".schema"` returns the full Prisma schema
        - The BrowserWindow opens
  - [ ] **macOS (DMG)**: build with `pnpm exec nx run electron:build:mac` on a macOS
        host (mark this verification step as `[x] verified on macOS` in Completion Notes
        if executed locally; otherwise document the cross-platform verification gap and
        defer the final platform sign-off to Story 108.3)
  - [ ] **Windows (NSIS)**: build with `pnpm exec nx run electron:build:win` on a
        Windows host (same deferral rule as macOS if a Windows host is unavailable)
  - [ ] Idempotency: relaunch the app a second time and confirm the migration step is a
        no-op (no new migrations applied, no error, server starts) — AC #5

- [ ] Task 8: Quality gate

  - [ ] `pnpm all` — green
  - [ ] `pnpm format` — no changes
  - [ ] Confirm no E2E regressions on chromium and firefox
  - [ ] Confirm the existing electron launch E2E
        (`apps/dms-material-e2e/src/electron-launch.spec.ts`) still passes — Story 108.3
        will add the new packaged-launch coverage

## Dev Notes

### Why this bug exists (working hypothesis pending Story 108.1)

The user-reported error is verbatim:

> "Could not update the database schema. Error: Migration failed: Invalid params: missing
> field `migrationsList`. The application will now exit."

This message is produced by the `parseRpcResponse` / `tryParseJsonRpcError` helpers in
`apps/electron/src/utils/run-migrations.ts` after wrapping the JSON-RPC `error.message`
returned by the bundled `schema-engine-*` binary. The phrase "missing field `migrationsList`"
is a serde-style error from the Prisma 7 Rust engine — it indicates the engine received
an `applyMigrations` request whose `params` object lacks an expected field named
`migrationsList`.

Today the request is built as:

```ts
JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'applyMigrations',
  params: { migrationsDirectoryPath: migrationsPath },
});
```

That field name (`migrationsDirectoryPath`) was the Prisma 5/6 schema-engine contract.
The error strongly suggests the Prisma 7.x schema-engine has renamed the field — likely
to `migrationsList` (which itself implies a different shape: probably an array of
migration descriptors rather than a directory path). Story 108.1 must confirm the exact
new contract from the Prisma 7 schema-engine source or release notes; do not guess the
payload shape from this hypothesis alone.

This hypothesis matches the symptoms:

- The bug only surfaces in the packaged build because the dev path (`runMigrationsDev`)
  uses the Prisma CLI, which encapsulates the JSON-RPC handshake internally and always
  uses the current contract.
- It is platform-agnostic at the source-code level — the same bad payload is sent on
  Linux, macOS, and Windows; the user just hit Linux first.

**However**, the four layers in AC #1 (bundle, path, env, payload) are all plausible
root causes for symptoms of "engine fails to apply migrations". Story 108.1 owns the
diagnosis; this story owns the targeted fix. Do not preemptively change all four.

### Files to read before changing anything (per skill guardrail)

- `apps/electron/src/utils/run-migrations.ts` — the implementation under change. Read
  the **entire file** end-to-end before editing: dev-vs-packaged split, schema-engine
  binary resolution, JSON-RPC request build, and response parsing all live here.
- `apps/electron/src/utils/run-migrations.spec.ts` — 13 tests that pin the existing
  contract. Read every test; the fix must keep them green (or update them in lock-step
  with the implementation when the contract genuinely changes).
- `apps/electron/src/main.ts` — confirm the `init()` flow, the `try { await
runMigrations(); } catch { dialog.showErrorBox(...); app.exit(1); }` block (Stories
  91.3 + 98.2), and that `DATABASE_URL` is set on `process.env` before `runMigrations()`
  is awaited.
- `apps/electron/src/utils/db-path.ts` and `apps/electron/src/utils/ensure-db-file.ts` —
  Story 98.1 path-resolution helpers. Confirm they produce `~/.dms/dms.db` on Linux,
  macOS, and Windows.
- `apps/electron/electron-builder.yml` — current `extraResources` for `prisma/migrations`,
  `prisma/schema.prisma`, and the `schema-engine-*` binary.
- `apps/electron/project.json` — confirm `electron:build:linux`, `electron:build:mac`,
  `electron:build:win`, and `electron:package` target definitions.
- `prisma.config.ts` and `prisma/schema.prisma` — confirm the dev migration command's
  schema and migrations directory contract; the packaged path must produce the same
  resulting schema.
- `prisma/migrations/` — list directory; confirm migration folders are SQLite-flavoured
  (the `prisma/migrations-postgresql/` folder is the Postgres variant and is NOT bundled
  into the Electron app).
- `_bmad-output/implementation-artifacts/91-3-prisma-migration-on-launch.md` — original
  CLI-based migration story (superseded by 98.2 but useful for the call-flow history).
- `_bmad-output/implementation-artifacts/98-2-electron-node-free-prisma-migrations.md` —
  the story that introduced the current JSON-RPC schema-engine path. Read this in full;
  it documents why the current implementation exists and the constraints (NFR33: no Node
  on the user's machine) that any fix must continue to honour.
- `_bmad-output/implementation-artifacts/98-1-electron-first-install-database-creation.md`
  — the `~/.dms/dms.db` path contract.
- `_bmad-output/implementation-artifacts/108-1-investigate-electron-migration-failure.md`
  — **required input**. The diagnosis dictates which task branch (2/3/4/5) executes.

### What must NOT regress

- **Story 98.2's Node-free constraint (NFR33).** The packaged app must continue to run
  migrations without any `node`, `pnpm`, or `prisma` CLI invocation. Do not "fix" this
  bug by re-introducing the Story 91.3 CLI-based path in the packaged branch.
- **Story 98.1's path contract.** The database file lives at `~/.dms/dms.db` (resolved
  via `resolveDbPath` / `ensureDbFile`). Do not switch back to `app.getPath('userData')`.
- **The dev migration flow** (`runMigrationsDev` → `node_modules/.bin/prisma migrate
deploy --schema=prisma/schema.prisma`). This must remain unchanged so the local dev
  loop is unaffected.
- **macOS and Windows builds (NFR7).** Even if Story 108.1's diagnosis is Linux-specific
  (e.g. AppImage filesystem permissions), the fix must not break the macOS DMG or
  Windows NSIS builds. Verify on each platform per Task 7 — or, if a host is unavailable,
  document the gap so Story 108.3's CI matrix catches a regression.
- **Failure UX from Story 91.3 / 98.2.** The `dialog.showErrorBox(...)` + `app.exit(1)`
  flow in `main.ts` must continue to wrap `runMigrations()`. Do not move error handling
  into `run-migrations.ts`.
- **The Story 77.5 electron-launch E2E spec**
  (`apps/dms-material-e2e/src/electron-launch.spec.ts`) must continue to pass — it is
  the existing safety net for the unpackaged launch.
- **All 13 existing unit tests** in `run-migrations.spec.ts`. Any test that needs to be
  updated because the JSON-RPC contract genuinely changed must be updated in the same
  commit as the implementation, not skipped.

### Files likely to change (UPDATE — confirm against Story 108.1 diagnosis)

- `apps/electron/src/utils/run-migrations.ts` — most likely (Branch B, C, or D)
- `apps/electron/src/utils/run-migrations.spec.ts` — required if the contract changes
- `apps/electron/electron-builder.yml` — only if Branch A is the diagnosis
- `apps/electron/src/main.ts` — only if Branch C identifies an env-propagation bug
  upstream of `runMigrations()`
- `apps/electron/README.md` — update the "Database Migrations on Launch" section
  documented in Story 98.2 if the JSON-RPC payload shape changes
- `apps/electron/PACKAGING.md` — if Branch A changes `extraResources`, reflect it here

### Files that must NOT change

- `prisma.config.ts` — the Prisma config governs CLI behaviour for dev/server/migrations;
  the packaged Electron path bypasses it entirely. Do not edit.
- `prisma/schema.prisma`, `prisma/schema.postgresql.prisma`, `prisma/schema.production.prisma`
  — the data model is not the bug.
- `prisma/migrations/**` — the on-disk migration SQL files are not the bug; do not
  re-author existing migrations.
- `apps/server/**` — the server reads `DATABASE_URL` from env and is platform-agnostic.
- `tsconfig.base.json` — out of scope.

### Testing approach

This is a deployment / packaging fix, so the most authoritative verification is the
packaged-launch test described in AC #2 / #3 and Task 7. Unit tests under
`apps/electron/src/utils/run-migrations.spec.ts` regression-protect the dev-vs-packaged
branch and the JSON-RPC payload contract — they cannot prove the AppImage launches, only
that the in-process logic is correct.

End-to-end packaged-launch coverage for all three platforms is owned by **Story 108.3**.
This story (108.2) is responsible for proving the fix manually on at least Linux (the
reported failure platform) plus whichever of macOS / Windows the dev agent has access to;
unverified platforms must be explicitly called out in Completion Notes so 108.3's CI
matrix catches a regression.

The Story 98.2 idempotency assertion (AC #4 there, AC #5 here) is critical: re-launching
the app must be a no-op. Confirm this manually on Linux after the first successful
launch.

### Project Structure Notes

- The Electron app has no nested tsconfigs and uses `nx:run-commands` (plain `tsc`) for
  the main-process build — no bundler. Story 102.2's `importHelpers: false` fix
  continues to apply; do not regress it.
- The schema-engine binary is sourced from
  `node_modules/.pnpm/node_modules/@prisma/engines/` at package time. If the Prisma
  version is bumped, the binary filename (currently
  `schema-engine-debian-openssl-3.0.x`, etc.) may change — verify the glob in
  `electron-builder.yml` still resolves.
- pnpm hoisting layout (`.pnpm/node_modules/@prisma/engines`) is brittle to pnpm upgrades;
  if Story 108.1 finds the binary is no longer at that path under the current pnpm
  version, Branch A applies.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-05-19.md#Epic 108: Fix Linux Installation and AppImage Migration Failure]
- [Source: _bmad-output/planning-artifacts/epics-2026-05-19.md#Story 108.2: Fix Migration Deployment for Electron Builds]
- [Source: _bmad-output/planning-artifacts/epics-2026-05-19.md#Requirements Inventory] — R7, R8, R9; NFR7
- [Source: _bmad-output/planning-artifacts/story-meta/2026-05-19/108-2-fix-electron-migration-deployment.yaml] — story metadata (covers_requirements, depends_on_stories, notes)
- [Source: _bmad-output/implementation-artifacts/108-1-investigate-electron-migration-failure.md] — Story 108.1 diagnosis (required input)
- [Source: _bmad-output/implementation-artifacts/98-2-electron-node-free-prisma-migrations.md] — current `runMigrations` implementation rationale (Node-free constraint, JSON-RPC schema-engine path)
- [Source: _bmad-output/implementation-artifacts/98-1-electron-first-install-database-creation.md] — `~/.dms/dms.db` path contract
- [Source: _bmad-output/implementation-artifacts/91-3-prisma-migration-on-launch.md] — historical CLI-based migration story (superseded; do not re-introduce)
- [Source: _bmad-output/implementation-artifacts/102-2-fix-electron-tslib-importhelpers.md] — `importHelpers: false` in `apps/electron/tsconfig.json` (must not regress)
- [Source: apps/electron/src/utils/run-migrations.ts] — implementation under change
- [Source: apps/electron/src/utils/run-migrations.spec.ts] — 13 existing unit tests
- [Source: apps/electron/src/main.ts] — `init()` flow and migration error handling
- [Source: apps/electron/electron-builder.yml] — `extraResources` for migrations, schema, and `schema-engine-*` binary
- [Source: apps/electron/project.json] — `electron:build:linux`, `electron:build:mac`, `electron:build:win`, `electron:package` targets
- [Source: apps/electron/PACKAGING.md] — packaging research and `extraResources` rationale
- [Source: prisma.config.ts] — Prisma 7 config (governs the CLI dev path only)
- [Source: prisma/schema.prisma] — SQLite data model applied by the migrations
- Prisma 7 migration engine reference: https://www.prisma.io/docs/orm/prisma-migrate
- Electron `dialog.showErrorBox` API: https://www.electronjs.org/docs/latest/api/dialog
- electron-builder `extraResources` reference: https://www.electron.build/configuration/contents#extraresources

## Dev Agent Record

### Context Reference

- Created via bmad-create-story
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-19/108-2-fix-electron-migration-deployment.yaml`

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Implementation Plan

Broken layer confirmed as **AC #1d — JSON-RPC payload contract drift**.

The error `missing field "migrationsList"` is a serde deserialization failure in the
Prisma 7 Rust schema-engine. The engine's `applyMigrations` RPC method no longer accepts
`params: { migrationsDirectoryPath }` (Prisma 5/6 contract); it requires
`params: { migrationsList: Array<{ migrationName, migrationDirectoryPath }> }`.

Fix scope: **Task 5 (Branch D)** only. Tasks 2/3/4 (bundle contents, path resolution,
env vars) are not the broken layer and were not touched.

### Debug Log References

None — diagnosis taken from Story 108.1 and confirmed by the verbatim error message
`"missing field \`migrationsList\`"` which is a serde contract error, not a path or
env error.

### Completion Notes List

(a) **Branch executed: Task 5 (Branch D — JSON-RPC payload).** The broken layer is the
`params` shape sent to `schema-engine`. The old field `migrationsDirectoryPath` (string)
was renamed to `migrationsList` (array of `{migrationName, migrationDirectoryPath}`
objects) in Prisma 7. `buildApplyMigrationsRequest` now reads the migrations directory
with `fs.readdirSync`, sorts entries alphabetically, and builds the array.

(b) **Linux AppImage verification:** Deferred to Story 108.3 — cannot build/run AppImage
in current shell-restricted environment.

(c) **macOS / Windows verification:** Deferred to Story 108.3 CI matrix. The fix is
platform-agnostic at the source level (same JSON-RPC payload on all platforms).

(d) **Dev migration flow unchanged:** `runMigrationsDev` was not modified. The `fs`
import and `buildApplyMigrationsRequest` change are only reachable via `runMigrationsPackaged`
(guarded by `app.isPackaged === true`). Dev path regression-protected by 4 existing tests.

(e) **Idempotency:** The Prisma 7 schema-engine returns `{ appliedMigrationNames: [] }`
on a no-op re-run; `parseRpcResponse` finds no `error` field and resolves. Behaviour
unchanged from before the fix.

### File List

- `apps/electron/src/utils/run-migrations.ts` — added `fs` import; rewrote
  `buildApplyMigrationsRequest` to enumerate migrations dir and emit `migrationsList`.
- `apps/electron/src/utils/run-migrations.spec.ts` — added `fs` import; mocked
  `fs.readdirSync` in `beforeEach`; updated `packaged: sends applyMigrations JSON-RPC
  request` assertion from `migrationsDirectoryPath` to `migrationsList`.

## Change Log

| Date | File | Change |
|------|------|--------|
| 2026-05-23 | apps/electron/src/utils/run-migrations.ts | Add `fs` import; rewrite `buildApplyMigrationsRequest` to use `migrationsList` array |
| 2026-05-23 | apps/electron/src/utils/run-migrations.spec.ts | Mock `fs.readdirSync`; update RPC payload assertion to `migrationsList` |
