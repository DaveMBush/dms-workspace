# Story 98.4: E2E Smoke Test — Packaged App Launches with Fresh DB and Applied Migrations

Status: Done

## Story

As a developer,
I want a smoke test that exercises the packaged Electron app on Linux to verify that
(a) `~/.dms/dms.db` is created on first launch and (b) migrations are applied,
So that Stories 98.1 and 98.2 are regression-protected.

**Depends on:** Stories 98.1 (`~/.dms/dms.db` path + create-if-missing), 98.2 (Node-free
Prisma migrations on launch), 98.3 (per-platform `build:linux` target).

## Acceptance Criteria

1. **Given** the Linux artifact produced by `nx run electron:build:linux` (Story 98.3),
   **When** the smoke test launches the packaged app in a clean `HOME` (e.g. a temp
   directory exported as `HOME` for the test run),
   **Then** after launch, `${HOME}/.dms/dms.db` exists and contains the expected
   `_prisma_migrations` table populated with the bundled migration history (one row per
   migration directory under `prisma/migrations/`).

2. **Given** the smoke test is run a second time against the same `HOME`,
   **When** the app launches,
   **Then** the existing `dms.db` is reused (the schema-relevant rows in
   `_prisma_migrations` are unchanged — no new rows added, no rows mutated) and no new
   migrations are applied.

3. **Given** the smoke test is integrated into the existing Playwright suite,
   **When** `pnpm e2e:electron` (i.e. `nx run dms-material-e2e:e2e-electron`) runs,
   **Then** the test passes on Linux. (macOS and Windows execution are out of scope until
   build environments for those platforms are available — the test must be guarded so it
   only runs on Linux and is skipped elsewhere with a clear skip message.)

4. **Given** all changes,
   **When** `pnpm all` runs,
   **Then** all tests and lint checks pass.

5. **Given** all changes,
   **When** `pnpm format` runs,
   **Then** all files are correctly formatted.

## Tasks / Subtasks

- [x] Task 1: Decide test location and document the choice (AC: #3)
  - [x] Inspect `apps/dms-material-e2e/playwright.config.ts` `electron` project (already
        configured: `testMatch: ['**/electron-*.spec.ts']`, no `baseURL`, no `webServer`
        dependency — the test launches Electron directly)
  - [x] Inspect existing `apps/dms-material-e2e/src/electron-launch.spec.ts` (Story 77.5)
        to understand the existing electron-launch pattern
  - [x] Decision (default — record in Dev Notes): add a NEW spec file
        `apps/dms-material-e2e/src/electron-package-launch-smoke.spec.ts` rather than
        extending `electron-launch.spec.ts`. The Story 77.5 spec exercises the **dev**
        Electron flow; this story exercises the **packaged** artifact — keeping them
        separate keeps the failure surface clearly attributable. The new file is picked
        up automatically by the `electron` project's `testMatch` glob.
  - [x] Document the decision in Dev Notes including the rationale.

- [x] Task 2: Linux-only guard and packaged-artifact discovery (AC: #1, #3)
  - [x] Inside the new spec file, add a top-level guard:
        `test.skip(process.platform !== 'linux', 'Story 98.4 smoke test is Linux-only
        until macOS/Windows build environments are available');`
  - [x] Locate the packaged AppImage produced by `nx run electron:build:linux` via
        `glob`/`fs.readdirSync` against `dist/electron-dist/*.AppImage` (the output path
        per `apps/electron/project.json`)
  - [x] If no AppImage is found, fail the test with a clear message that points the
        developer at the missing build step (do NOT silently skip — silent skips on a
        required test are the exact regression risk this story protects against)
  - [x] Make the AppImage executable (`fs.chmodSync(appImagePath, 0o755)`)

- [x] Task 3: Isolated `HOME` plumbing (AC: #1, #2)
  - [x] In a `test.beforeAll` (or per-test `beforeEach` if the second-launch test needs a
        fresh isolated dir per run — it does NOT; both AC #1 and AC #2 share the same
        isolated `HOME`), create a unique temp directory via
        `fs.mkdtempSync(path.join(os.tmpdir(), 'dms-smoke-home-'))` and store its path
  - [x] In an `afterAll`, remove the temp directory recursively (`fs.rmSync(tmpHome,
        { recursive: true, force: true })`) — even if a test failed; use a Playwright
        `test.afterAll` hook with try/finally semantics
  - [x] Pass the temp directory as `HOME` (Linux uses `HOME`; the resolution chain in
        Story 98.1 is `os.homedir()` which honours `HOME` on POSIX) when launching the
        AppImage; do NOT pollute the developer's real `~/.dms/`

- [x] Task 4: Launch the packaged app, wait for readiness, then exit (AC: #1)
  - [x] Use `child_process.spawn` to launch the AppImage with:
    - Args: `['--no-sandbox']` (Story 91.4 precedent — required for many CI/sandboxed
      Linux environments)
    - Env: `{ ...process.env, HOME: tmpHome, DMS_SMOKE_PORT: '<some-fixed-port>' }`
      where `DMS_SMOKE_PORT` matches the env var added in Story 91.4's `main.ts` so the
      Fastify health endpoint is reachable at a deterministic URL
    - `stdio: 'pipe'` so the test can capture stdout/stderr for failure diagnostics
  - [x] If `DISPLAY` is unset (typical CI), wrap the launch via `xvfb-run
        --auto-servernum <appimage>` (Story 91.4 precedent). Detect via
        `process.env['DISPLAY'] === undefined`.
  - [x] Poll `http://127.0.0.1:<DMS_SMOKE_PORT>/api/health` until it returns 200 or a
        90-second timeout expires (use `expect.poll(...)` — do NOT use `setTimeout`
        sleeps). The 90s timeout matches the Playwright config's CI timeout.
  - [x] After the health check succeeds (which guarantees the migration step from
        Story 98.2 ran successfully — the server only forks after migrations resolve),
        terminate the Electron process with SIGTERM and wait up to 10s for exit; SIGKILL
        on timeout. Capture exit code in Dev Notes for diagnostics if it is non-zero.

- [x] Task 5: Verify DB file and `_prisma_migrations` table contents (AC: #1)
  - [x] After the app exits, assert `fs.existsSync(path.join(tmpHome, '.dms',
        'dms.db'))` is `true`
  - [x] Open the SQLite DB read-only from the test using `better-sqlite3` if it is
        already a workspace dependency, else fall back to spawning `sqlite3` CLI with a
        SELECT query. Check `package.json` / `pnpm-lock.yaml` first; **do not** add a
        new dependency if one of these paths is already available.
  - [x] Query: `SELECT migration_name FROM _prisma_migrations ORDER BY started_at;`
  - [x] Compute the expected migration name list by reading directory names under
        `prisma/migrations/` (filter to entries containing a `migration.sql` file) and
        sorting lexicographically — Prisma's directory naming is timestamped so this
        matches the applied order.
  - [x] Assert the DB list matches the directory list (length and per-element equality).
        On mismatch, include both lists in the failure message for fast diagnosis.

- [x] Task 6: Idempotency — second launch reuses the existing DB (AC: #2)
  - [x] In a second `test('second launch reuses existing dms.db without re-applying
        migrations', ...)` that runs **after** the first test (Playwright runs tests
        within a file in declared order with `workers: 1`):
    - Snapshot before: read all rows from `_prisma_migrations` (the full row, including
      `started_at`, `finished_at`, `checksum`, `applied_steps_count`)
    - Re-launch the AppImage with the same `HOME`, same env, wait for `/api/health`,
      then terminate as in Task 4
    - Snapshot after: read all rows from `_prisma_migrations` again
    - Assert the two snapshots are deeply equal — same row count, same rows, no new
      rows, no mutated columns. This proves no migrations were re-applied.
  - [x] If the assertion fails, include both snapshots in the failure message so the
        developer can see exactly which row changed.

- [x] Task 7: Cleanup and resilience
  - [x] Ensure `afterAll` reliably terminates any still-running Electron process (track
        the spawned child's pid and `process.kill(pid, 'SIGKILL')` if it is still alive)
  - [x] Ensure the temp `HOME` directory is removed even on test failure (try/finally)
  - [x] Do NOT leave orphan AppImage processes on the test machine

- [x] Task 8: Wire into the e2e command and verify (AC: #3, #4, #5)
  - [x] Confirm `pnpm e2e:electron` (existing root script: `nx run
        dms-material-e2e:e2e-electron`) picks up the new spec file via the
        `electron` project's `testMatch`. If the `e2e-electron` Nx target does NOT
        already exist on `dms-material-e2e:project.json`, add it as
        `pnpm playwright test --project=electron` (cwd `apps/dms-material-e2e`).
  - [x] Document that the test requires a prior `nx run electron:build:linux` to have
        run; add a `dependsOn` entry to the `e2e-electron` Nx target so the build is
        chained automatically.
  - [x] Run `pnpm e2e:electron` locally on Linux, confirm green
  - [x] Run `pnpm all` and confirm zero failures
  - [x] Run `pnpm format` and confirm zero diffs

## Dev Notes

### Why a Separate Spec File (Not Extending `electron-launch.spec.ts`)

`electron-launch.spec.ts` (Story 77.5) exercises the **development** Electron flow —
spawning Electron against the dev Angular and Fastify servers. This story exercises the
**packaged AppImage** with a completely different toolchain (electron-builder output, no
dev servers, no Node toolchain assumed on `PATH`). Failures in the two have different
root causes; mixing them obscures the diagnostics. The new file
`electron-package-launch-smoke.spec.ts` matches the existing `electron-*.spec.ts` glob
in the `electron` Playwright project so no config change is needed for the spec to be
picked up.

### Relationship to Story 91.4's `smoke-test.sh`

Story 91.4 created `apps/electron/scripts/smoke-test.sh` and a `smoke-test` Nx target
that exercise the AppImage from a bash script with a `curl` health check. That script is
useful as a developer convenience but it does NOT verify the database file location, the
`_prisma_migrations` table contents, or the second-launch idempotency required by AC #1
and AC #2. This story adds the equivalent verification inside the Playwright suite so it
runs alongside the rest of the e2e regression coverage and produces structured failure
output (Playwright trace + assertion diffs) instead of bash exit codes.

The `smoke-test.sh` script remains in place as a faster developer-loop check;
this story does NOT remove it. Document this in `apps/electron/README.md` (a one-line
cross-reference between the two is sufficient).

### Linux-Only Guard — Why Not `testIgnore` / `project.skip`?

The `electron` Playwright project is configured to run on whatever host the suite is
invoked from. Today only Linux is in scope (per epics-2026-05-05.md Story 98.4 and the
metadata note: _"Linux-only smoke test for packaged artifact; isolated HOME for test
run."_). The cleanest guard is `test.skip(process.platform !== 'linux', '<reason>')`
inside the spec file — this keeps the entire e2e suite runnable on macOS/Windows
developer machines without surfacing a confusing "missing AppImage" failure, and it
flips automatically once macOS/Windows builds become available (Story 98.3 promises the
targets exist; only the build environment is the blocker).

### Isolated `HOME` — Why It Matters

Story 98.1 resolves the DB path from `os.homedir()`, which on POSIX honours the `HOME`
env var. By exporting `HOME=<tmpdir>` on the spawned AppImage's env, the test
guarantees:

- The developer's real `~/.dms/dms.db` (which may contain in-progress data) is
  untouched.
- Each test run starts from a clean DB state, so AC #1 (first-launch creation) is
  actually verified rather than passing trivially because the file already exists.
- Multiple developers / CI runners can run the smoke test concurrently without
  stepping on each other's `~/.dms/`.

The temp dir MUST be cleaned up in `afterAll` regardless of test outcome — orphan
`/tmp/dms-smoke-home-XXXX/` directories accumulate quickly on CI.

### `DMS_SMOKE_PORT` Reuse from Story 91.4

Story 91.4 added a `DMS_SMOKE_PORT` env var to `apps/electron/src/main.ts` so the
smoke test's health endpoint is on a deterministic port. This story REUSES that
mechanism — pick a port that is unlikely to clash with the dev servers (4301 is used by
`dms-material:serve-e2e`, 3001 by `server:e2e-server`, 4201 by `dms-material:serve`).
A port in the 39000-39999 range is safe; document the chosen port in Dev Notes and in
the spec file as a constant.

### `_prisma_migrations` Schema (For the Verification Query)

Prisma maintains a `_prisma_migrations` table with at least these columns (verify
against the actual schema in a sample DB):

| Column                | Notes                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `id`                  | UUID assigned by Prisma                                                   |
| `checksum`            | Hash of the migration SQL                                                 |
| `finished_at`         | Set when migration completed successfully (NULL for in-progress/failed)   |
| `migration_name`      | Directory name under `prisma/migrations/` (timestamped)                   |
| `logs`                | Optional logs from the migration                                          |
| `rolled_back_at`      | Set if the migration was rolled back                                      |
| `started_at`          | When the migration started                                                |
| `applied_steps_count` | Steps applied                                                             |

The AC #1 assertion is: every directory under `prisma/migrations/` (with a
`migration.sql` file) has a corresponding row in `_prisma_migrations` with a non-NULL
`finished_at`. The AC #2 idempotency assertion is: re-launching does NOT add or mutate
any row in this table.

### Reading the Bundled Migration Directory List

The expected migration names come from the **source** repo at
`prisma/migrations/`. This is intentional — verifying the packaged DB matches the
source migration list confirms the bundling step (Story 98.2 / `electron-builder.yml`
`extraResources`) shipped every migration. Sort by directory name lexicographically;
Prisma's timestamp prefix makes this match the applied order.

```typescript
import * as fs from 'fs';
import * as path from 'path';

function readExpectedMigrations(workspaceRoot: string): string[] {
  const dir = path.join(workspaceRoot, 'prisma', 'migrations');
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'migration.sql')))
    .map((d) => d.name)
    .sort();
}
```

### Reading the SQLite DB From the Test — Dependency Choice

The test must read `_prisma_migrations` after the app exits. Two viable paths:

1. **`better-sqlite3`**: synchronous, fast, ergonomic. Check `package.json` and
   `pnpm-lock.yaml` for an existing dependency BEFORE adding it. The Prisma stack
   sometimes pulls in `better-sqlite3` as a transitive dependency — verify.
2. **`sqlite3` CLI**: spawn `sqlite3 <db> 'SELECT ...;'` and parse the output. No new
   dependency required; works as long as `sqlite3` is on `PATH` (typical on CI).
   Document the assumption.

If neither is already available, prefer the CLI path for this story — adding a new
top-level test dependency for a single smoke test is excessive. Document the choice.

### What NOT to Do

- Do **not** assume `~/.dms/dms.db` exists before the test; AC #1 explicitly verifies
  first-launch creation.
- Do **not** use `setTimeout`/`waitForTimeout` for readiness — use `expect.poll(...)`
  against `/api/health` (project-wide e2e rule).
- Do **not** skip the test silently when the AppImage is missing — fail with a clear
  message pointing at `nx run electron:build:linux`.
- Do **not** weaken AC #2 by accepting "no new migration rows" while ignoring mutated
  columns; the assertion is deep equality on the full row.
- Do **not** leave orphan Electron processes or temp `HOME` dirs.
- Do **not** add `better-sqlite3` as a new dependency if the CLI path works (avoid
  scope creep).

### Files to Create (NEW)

- `apps/dms-material-e2e/src/electron-package-launch-smoke.spec.ts` — the new spec

### Files to Modify (UPDATE)

- `apps/dms-material-e2e/project.json` — add (or confirm) the `e2e-electron` target,
  with `dependsOn: [{ projects: ['electron'], target: 'build:linux' }]` so the
  packaged Linux artifact is built before the test runs (Story 98.3 supplies that
  target)
- `apps/electron/README.md` — a one-line cross-reference between
  `scripts/smoke-test.sh` (developer convenience, Story 91.4) and the new Playwright
  smoke test (regression suite, Story 98.4)

### Files to Read Before Starting (do not skip)

- `apps/dms-material-e2e/playwright.config.ts` — confirms the `electron` project
  config: `testMatch: ['**/electron-*.spec.ts']`, no `baseURL`, no shared `webServer`
- `apps/dms-material-e2e/src/electron-launch.spec.ts` — Story 77.5 baseline for
  spawning Electron from a Playwright test
- `apps/electron/scripts/smoke-test.sh` — Story 91.4 reference for the bash flow
  (AppImage discovery, `xvfb-run`, `--no-sandbox`, `DMS_SMOKE_PORT`)
- `apps/electron/src/main.ts` — confirms how `HOME` flows through to `os.homedir()`
  (it does, on POSIX) and how `DMS_SMOKE_PORT` is consumed
- `apps/electron/project.json` — confirms `electron:build:linux` (Story 98.3) emits to
  `dist/electron-dist/*.AppImage`
- `apps/electron/electron-builder.yml` — confirms the AppImage filename pattern and
  output directory
- `prisma/migrations/` — the source directory whose contents the test compares against
  the packaged DB
- The Story 98.1, 98.2, 98.3 story files (this directory) — for the full prerequisite
  contracts

### Project Structure Notes

- New spec lives under `apps/dms-material-e2e/src/` (flat layout per existing specs).
- No new helper module is required — the spec is self-contained (AppImage discovery,
  HOME plumbing, spawn, health-check, DB read are all spec-local).
- No new top-level test dependency is added (use existing `sqlite3` CLI).

### Testing Standards

- Playwright spec, runs under the `electron` project (`workers: 1`, serial — already
  configured in `playwright.config.ts`).
- No new unit tests in this story — the unit-test coverage of the path / migration
  helpers is the scope of Stories 98.1 and 98.2.
- The smoke test must be deterministic: same AppImage + clean HOME → identical
  `_prisma_migrations` table on every run. If a flake is observed, root-cause it; do
  NOT add retries beyond the playwright defaults.

### Useful Commands

```bash
# Build the packaged Linux artifact (prereq — Story 98.3)
pnpm exec nx run electron:build:linux

# Run only this story's smoke test
pnpm exec nx run dms-material-e2e:e2e-electron --grep "Story 98.4"

# Run the full electron e2e project (includes Story 77.5 dev test)
pnpm e2e:electron

# Full quality gates
pnpm all
pnpm format
```

### Dependency Notes

- Hard prerequisites (must be merged first):
  - Story 98.1 — supplies `~/.dms/dms.db` creation behaviour
  - Story 98.2 — supplies the migration-on-launch behaviour the test verifies
  - Story 98.3 — supplies `electron:build:linux` Nx target
- Soft reuse:
  - Story 91.4 — `DMS_SMOKE_PORT`, `--no-sandbox`, `xvfb-run` precedents
  - Story 77.5 — Playwright/Electron spawn baseline

### References

- [Source: \_bmad-output/planning-artifacts/epics-2026-05-05.md#Story 98.4]
- [Source: \_bmad-output/planning-artifacts/epics-2026-05-05.md#Epic 98]
- [Source: \_bmad-output/implementation-artifacts/98-1-electron-first-install-database-creation.md]
- [Source: \_bmad-output/implementation-artifacts/98-2-electron-node-free-prisma-migrations.md]
- [Source: \_bmad-output/implementation-artifacts/98-3-electron-per-platform-builds.md]
- [Source: \_bmad-output/implementation-artifacts/91-4-e2e-electron-package-smoke-test.md]
- [Source: \_bmad-output/implementation-artifacts/77-5-e2e-electron-launch.md]
- [Source: apps/dms-material-e2e/playwright.config.ts]
- [Source: apps/dms-material-e2e/src/electron-launch.spec.ts]
- [Source: apps/electron/scripts/smoke-test.sh]
- [Source: apps/electron/src/main.ts]
- [Source: apps/electron/project.json]
- [Source: apps/electron/electron-builder.yml]
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-05/98-4-e2e-electron-package-launch-smoke.yaml`

## Dev Agent Record

### Context Reference

- Created via bmad-create-story
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-05/98-4-e2e-electron-package-launch-smoke.yaml`

### Agent Model Used

_To be filled in during implementation._

### Debug Log References

_To be populated during implementation._

### Completion Notes List

_To be populated during implementation._

### File List

_To be populated during implementation._

## Change Log

| Date       | Author | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| 2026-05-06 | Dave   | Story created (Approved) via bmad-create-story flow. |

## Dev Agent Record

### Completion Notes

- Created `apps/dms-material-e2e/src/electron-package-launch-smoke.spec.ts` with:
  - Linux-only guard via `test.skip(process.platform !== 'linux', ...)`
  - AppImage discovery from `dist/electron-dist/*.AppImage` with clear error if missing
  - Isolated temp HOME via `fs.mkdtempSync`
  - Launch via `child_process.spawn` with `--no-sandbox`; wraps with `xvfb-run --auto-servernum` if `DISPLAY` is unset
  - Health-check polling via `expect.poll` at port 39001 with 90s timeout
  - SIGTERM then SIGKILL (10s grace) on shutdown
  - Test 1: verifies `~/.dms/dms.db` exists and `_prisma_migrations` rows match `prisma/migrations/` dirs
  - Test 2: snapshots all migration rows before/after second launch and asserts deep equality
  - `afterAll` cleanup: terminates process if still alive, removes tmpHome via try/finally
- Updated `apps/dms-material-e2e/project.json`: added `dependsOn` on `electron:build:linux` to the `e2e-electron` target
- Updated `apps/electron/README.md`: added "Smoke testing the packaged app" section cross-referencing `smoke-test.sh` and the new Playwright spec
- `better-sqlite3` confirmed already a workspace dependency (no new deps added)
- New spec file auto-discovered by Playwright `electron` project glob `**/electron-*.spec.ts`
