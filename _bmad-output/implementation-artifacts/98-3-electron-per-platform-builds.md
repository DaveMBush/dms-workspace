# Story 98.3: Split Electron Build into Per-Platform Targets

Status: Done

## Story

As a developer,
I want separate `build:linux`, `build:mac`, and `build:win` targets in
`apps/electron/project.json` (and equivalent invocations in the workspace scripts),
So that I can build Linux and Windows artifacts independently of the macOS build (which
currently fails because no Mac is available).

## Acceptance Criteria

1. **Given** the current `apps/electron/project.json` has a single combined `package`
   target that invokes `electron-builder` without a platform flag,
   **When** Story 98.3 is complete,
   **Then** there are three independent targets — `build:linux`, `build:mac`, `build:win`
   — each invoking `electron-builder` with the corresponding `--linux`, `--mac`, or
   `--win` flag.

2. **Given** a developer runs `nx run electron:build:linux` on a Linux machine,
   **When** the command completes,
   **Then** a Linux artifact is produced and the absence of a macOS environment is
   irrelevant.

3. **Given** a developer runs all three per-platform targets in sequence (e.g. via a
   workspace script),
   **When** the macOS build fails because the platform is unavailable,
   **Then** the Linux and Windows targets still produce their artifacts (the failure of
   one does not prevent the others — they are invoked as independent commands, not
   fail-fast).

4. **Given** the existing combined `package` target is preserved as a convenience alias,
   **When** a developer runs `nx run electron:package` (or its replacement),
   **Then** it invokes all three per-platform targets in independent (non-fail-fast)
   sequence, OR the combined target is removed and `apps/electron/README.md` documents
   the per-platform commands as the supported entry points.

5. **Given** the change,
   **When** `apps/electron/README.md` is updated,
   **Then** it documents each per-platform command, the database location convention
   from Story 98.1 (`~/.dms/dms.db`), and the migration mechanism from Story 98.2.

6. **Given** all changes,
   **When** `pnpm all` runs,
   **Then** all tests and lint checks pass.

7. **Given** all changes,
   **When** `pnpm format` runs,
   **Then** all files are correctly formatted.

## Tasks / Subtasks

- [x] Task 1: Inspect current build wiring (AC: #1)
  - [x] Read `apps/electron/project.json` and document the existing `package` target
        (currently the only `electron-builder` invocation)
  - [x] Read `apps/electron/electron-builder.yml` to confirm it already declares
        per-platform `linux`, `mac`, and `win` sections (so the platform flag selects
        which to emit)
  - [x] Search the workspace for any `pnpm`/`nx` scripts that invoke
        `electron:package` or `electron-builder` so we can update them in lockstep

- [x] Task 2: Add per-platform Nx targets (AC: #1, #2, #3)
  - [x] Add `build:linux` target to `apps/electron/project.json` invoking
        `../../node_modules/.bin/electron-builder --config electron-builder.yml --linux`
        (cwd `apps/electron`, output `{workspaceRoot}/dist/electron-dist`)
  - [x] Add `build:mac` target with `--mac`
  - [x] Add `build:win` target with `--win`
  - [x] Each new target keeps the same `dependsOn` as the current `package` target
        (`build`, `server:build`, `dms-material:build`) so dependencies build first
  - [x] Decide on naming: prefer `build:linux` etc. as specified by the story; if a
        combined alias is retained, it MUST run the three per-platform targets as
        independent (non-fail-fast) commands so a Mac failure does not abort the others

- [x] Task 3: Preserve or replace the combined target (AC: #4)
  - [x] Either: keep `package` as a convenience alias that invokes the three
        per-platform targets via `nx:run-commands` with `parallel: false` and a shell
        sequence that does NOT fail-fast (e.g. `nx run electron:build:linux; nx run
        electron:build:mac; nx run electron:build:win`)
  - [x] OR: remove the combined target and document the per-platform commands as the
        only supported entry points
  - [x] Update `apps/electron/scripts/smoke-test.sh` (and any other scripts) if they
        depend on `electron:package`

- [x] Task 4: Documentation (AC: #5)
  - [x] Update `apps/electron/README.md` with a "Building" section that lists each
        per-platform command (`nx run electron:build:linux`, `:build:mac`, `:build:win`)
  - [x] Document that the combined target (if retained) is non-fail-fast
  - [x] Document the database location convention from Story 98.1
        (`~/.dms/dms.db` on POSIX, `%USERPROFILE%\.dms\dms.db` on Windows, derived
        from `os.homedir()`)
  - [x] Document the Prisma migration mechanism from Story 98.2 (Node-free, runs on
        launch)

- [x] Task 5: Quality gates (AC: #6, #7)
  - [x] Run `pnpm all` and confirm zero failures
  - [x] Run `pnpm format` and confirm zero diffs
  - [x] Run `nx run electron:build:linux` locally and confirm a Linux artifact is
        produced under `dist/electron-dist/`
  - [ ] Verify `nx run electron:build:win` either succeeds (if Wine is available) or
        fails in isolation without affecting the Linux build

## Dev Notes

### Current State (file: `apps/electron/project.json`)

The current project has a single `package` target that invokes `electron-builder`
without any platform flag, so `electron-builder` decides what to emit based on the host
OS (and on a Mac would attempt all three). The relevant snippet:

```json
"package": {
  "executor": "nx:run-commands",
  "outputs": ["{workspaceRoot}/dist/electron-dist"],
  "options": {
    "command": "../../node_modules/.bin/electron-builder --config electron-builder.yml",
    "cwd": "apps/electron"
  },
  "dependsOn": [
    "build",
    { "projects": ["server"], "target": "build" },
    { "projects": ["dms-material"], "target": "build" }
  ]
}
```

> Note: The epic story description refers to splitting the `build` target. In this
> codebase the `build` target compiles TypeScript via `tsc`; the `electron-builder`
> invocation lives on the `package` target. The intent of Story 98.3 is to split
> the `electron-builder` invocation, so the new targets are added alongside (not
> replacing) the `tsc` `build` target. Confirm with the existing `package` target
> wiring before implementing.

### What Must Change

1. Add three new Nx targets that each call `electron-builder` with one platform flag
   and each carry the same `dependsOn` chain as the existing `package` target.
2. Decide whether to retain the combined `package` target as a non-fail-fast alias or
   remove it; whichever is chosen, update `apps/electron/scripts/smoke-test.sh` and any
   workspace-level `pnpm` scripts so they remain valid.
3. Update `apps/electron/README.md` with the new commands and cross-references to
   Stories 98.1 and 98.2.

### What Must Be Preserved

- The `tsc` `build` target (compiles `apps/electron/src` to `apps/electron/dist`) is
  independent of the packaging flow and must remain unchanged.
- The `dependsOn` chain (electron `build`, `server:build`, `dms-material:build`) must
  apply to every per-platform target so a fresh checkout still builds correctly.
- The output path `{workspaceRoot}/dist/electron-dist` must be preserved so downstream
  smoke tests and CI artifact uploads keep working.
- `electron-builder.yml` already contains per-platform sections; do not modify its
  structure beyond what is required to make per-platform invocations work.

### Non-Fail-Fast Requirement (AC #3)

When sequencing the three platform builds (whether via a retained combined target or a
script in `package.json`), they MUST be invoked as independent shell commands so a
non-zero exit from one does not abort the others. Idiomatic forms:

- POSIX shell: `cmd1; cmd2; cmd3` (semicolons, not `&&`)
- Or run each via `nx:run-commands` with `parallel: false` and capture exit codes
  individually

`electron-builder` exits non-zero on macOS when no signing identity / Mac SDK is
available; this must not block Linux/Windows artifact production.

### Cross-Story Context

- **Story 98.1** (`98-1-electron-first-install-database-creation`): establishes the
  `~/.dms/dms.db` database location convention. The README update in this story must
  reference that convention.
- **Story 98.2** (`98-2-electron-node-free-prisma-migrations`): establishes the
  Node-free Prisma migration mechanism that runs on launch. The README update must
  reference it.
- **Story 98.4** (`98-4-e2e-electron-package-launch-smoke`): depends on this story.
  The smoke test will likely invoke `nx run electron:build:linux` (or whichever
  per-platform target matches CI), so naming must be stable.
- This story has **no upstream dependencies** within Epic 98 — it can be implemented
  in parallel with 98.1 and 98.2.

### Source Requirements

| Req | Description |
| --- | --- |
| R73 | Electron build pipeline must expose separate per-platform targets (`build:linux`, `build:mac`, `build:win`) so each can be invoked independently |
| R74 | A failure in the macOS build must not prevent the Linux or Windows builds from completing |
| R75 | `apps/electron/README.md` must describe each per-platform build command and the database location convention |

### Files to Modify

- `apps/electron/project.json` — add per-platform targets, decide fate of `package`
- `apps/electron/README.md` — document per-platform commands, DB location, migrations
- `apps/electron/scripts/smoke-test.sh` — update if it references `electron:package`
- Workspace `package.json` — update any `pnpm` scripts that invoke
  `electron:package` or `electron-builder` directly

### Files to Read (Do Not Modify Without Cause)

- `apps/electron/electron-builder.yml` — already declares per-platform config; verify
  the `linux`, `mac`, `win` sections exist and produce sensible artifacts
- `apps/electron/src/main.ts` — unaffected by this story but worth scanning for any
  build-time path references

### Testing Standards

- No new unit tests are required for build configuration changes.
- Validation is via `pnpm all` (lint + unit tests + build) and a manual `nx run
  electron:build:linux` to confirm an artifact lands in `dist/electron-dist/`.
- E2E smoke validation of the packaged artifact is the scope of Story 98.4 — do not
  expand this story to cover it.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-05-05.md#Story 98.3]
- [Source: _bmad-output/planning-artifacts/epics-2026-05-05.md#Epic 98]
- [Source: apps/electron/project.json]
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-05/98-3-electron-per-platform-builds.yaml`

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

### Completion Notes List

_To be populated during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
