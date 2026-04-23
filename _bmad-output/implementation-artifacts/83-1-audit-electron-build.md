# Story 83.1: Audit and Document Current Electron Build Failures

Status: Review

## Story

As a developer,
I want a complete diagnosis of every error and warning produced by the current Electron build
pipeline,
so that Story 83.3 has a precise list of fixes to implement and Story 83.2 documents the
correct, working configuration.

## Acceptance Criteria

1. **Given** the `apps/electron` package as it currently exists,
   **When** the developer runs `pnpm nx run electron:build` (or the equivalent Nx target),
   **Then** every error and warning is captured in Dev Notes with the full error message, the
   file path where it originates, and a hypothesis for the root cause.

2. **Given** the inventory of failures from the build run,
   **When** the developer inspects the `apps/electron/package.json`, `project.json`, and
   `main.ts` / `preload.ts` files,
   **Then** configuration issues (wrong entry-point paths, missing build step for the Angular
   app, mismatched Electron version, incorrect `webPreferences`, etc.) are identified and
   documented in Dev Notes.

3. **Given** the audit is complete,
   **When** no production or configuration code is changed in this story,
   **Then** `pnpm all` continues to pass at the same level as before (build failures from
   the Electron target are acceptable and expected at this stage).

## Tasks / Subtasks

- [x] Task 1: Run the Electron build and capture all output (AC: #1)

  - [x] Run `pnpm nx run electron:build` from the workspace root
  - [x] Capture the full terminal output — every error, warning, and info line
  - [x] Note the exit code of the command
  - [x] If the TypeScript compilation step (`tsc -p tsconfig.json`) fails, save the full `tsc`
        error output separately
  - [x] Document results in a scratch section at the bottom of this story file under
        "Dev Agent Record"

- [x] Task 2: Review `apps/electron/project.json` for build target completeness (AC: #2)

  - [x] Read `apps/electron/project.json` — note the `build` target uses only `tsc` with
        no packaging step
  - [x] Confirm: the `build` target does **not** invoke `electron-builder` or
        `electron-packager` — there is no distributable creation step
  - [x] Confirm: the `start` target depends on `server:build` and `dms-material:build` but
        `build` does not — is this intentional?
  - [x] Document all gaps between what the current `build` target does vs. what is needed for
        a distributable

- [x] Task 3: Review `apps/electron/package.json` for missing fields (AC: #2)

  - [x] Check for `electron-builder` or `electron-packager` in `devDependencies`
  - [x] Check workspace root `package.json` for `electron-builder`/`electron-packager`
  - [x] Check `main` field — currently `"main": "dist/main.js"`, confirm this is the correct
        path relative to the package root after TypeScript compilation
  - [x] Check if `electron` version is declared (direct or in root `package.json`)
  - [x] Document any missing dependencies or misconfigured fields

- [x] Task 4: Review `apps/electron/src/main.ts` for runtime path issues (AC: #2)

  - [x] Read `main.ts` — specifically the `serverPath` construction:
        `path.join(__dirname, '../../../dist/apps/server/main.js')`
  - [x] Verify this relative path is correct when running from `apps/electron/dist/main.js`
        (it would resolve to `<workspace>/dist/apps/server/main.js`)
  - [x] Note that for an asar-packaged Electron app, `__dirname` resolves differently inside
        the archive — document this as a risk for Story 83.3
  - [x] Check `win.loadURL` — currently loads `http://localhost:${port}` which works for
        development but a true distributable might need `file://` loading of Angular static
        files instead

- [x] Task 5: Review `apps/electron/tsconfig.json` for compilation configuration (AC: #1)

  - [x] Read `apps/electron/tsconfig.json`
  - [x] Confirm `module`, `target`, `outDir` settings are appropriate for Electron (Node.js
        CommonJS or ESM)
  - [x] Note any TypeScript errors that would prevent compilation
  - [x] Confirm `paths` or `baseUrl` settings do not cause import resolution failures

- [x] Task 6: Review `apps/electron/src/preload.ts` (AC: #2)

  - [x] Confirm preload compiles cleanly
  - [x] Check `contextBridge.exposeInMainWorld` usage is correct
  - [x] Note the compiled output path and confirm `webPreferences.preload` in `main.ts`
        points to the correct compiled file

- [x] Task 7: Produce a prioritised fix list for Story 83.3 (AC: #1, #2)

  - [x] List all discovered issues ranked by severity (blocker / major / minor)
  - [x] For each issue: state the file, the problem, and the proposed fix
  - [x] Write this list in the Dev Agent Record section at the bottom of this file
  - [x] Identify whether a full `electron-builder` distributable is needed for "build" or
        whether `pnpm nx run electron:start` is the primary use case

- [x] Task 8: Verify `pnpm all` baseline is unchanged (AC: #3)
  - [x] Run `pnpm all` — confirm all previously passing tests still pass
  - [x] Electron build failures are expected and acceptable at this stage
  - [x] No application code was changed in this story

## Dev Notes

### Current Build Target

The `build` target in `apps/electron/project.json` runs only:

```
../../node_modules/.bin/tsc -p tsconfig.json
```

from the `apps/electron` directory. This compiles TypeScript to `apps/electron/dist/`.
It does **not** package an Electron distributable. The resulting `dist/main.js` can be run
with `electron .` (the `start` script in `package.json`), but there is no installer or
packaged `.app`/`.exe` output.

### Key Architecture Points Already Implemented

- `main.ts` forks the Fastify server as a child process using `fork()`, then opens a
  `BrowserWindow` that loads `http://localhost:<dynamic-port>`
- `preload.ts` exposes `window.electronAPI.getApiPort()` via `contextBridge`
- External links are intercepted via `will-navigate` and `setWindowOpenHandler` and opened
  in the system browser via `shell.openExternal()`
- Content Security Policy is applied via `session.defaultSession.webRequest.onHeadersReceived`
- The Angular app is NOT bundled into the Electron app — it runs as a separate process (the
  Fastify server serves both the API and Angular static files)

### Files to Read

| File                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `apps/electron/project.json`      | Build/start/test targets                                 |
| `apps/electron/package.json`      | Entry point, scripts, dependencies                       |
| `apps/electron/tsconfig.json`     | TypeScript compilation config                            |
| `apps/electron/src/main.ts`       | Main process — BrowserWindow, server fork, link handling |
| `apps/electron/src/preload.ts`    | Preload script — contextBridge                           |
| `apps/electron/src/utils/port.ts` | Dynamic port finder                                      |

### Expected Issue: No Distributable Packaging Step

The current `build` target only compiles TypeScript. To produce a real distributable
(`.app`, `.exe`, `.deb`), `electron-builder` must be configured. Investigate:

- Is `electron-builder` in the workspace root `package.json` devDependencies?
- Is there an `electron-builder.yml` or `build` config in `apps/electron/package.json`?
- If not, document that this is the missing piece.

### Key Commands

```bash
# Run the Electron build target and capture output
pnpm nx run electron:build 2>&1 | tee /tmp/electron-build-output.txt

# Try starting Electron directly (requires server and dms-material already built)
pnpm nx run electron:start

# Check what electron version is installed
node -e "console.log(require('./node_modules/electron/package.json').version)"

# Run full test suite to confirm baseline is unchanged
pnpm all
```

### References

- [Source: apps/electron/project.json]
- [Source: apps/electron/src/main.ts]
- [Source: apps/electron/package.json]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#epic-83]

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Implementation Plan

- Reproduce `electron:build` inside the story worktree with `NX_DAEMON=false` and
  `NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build` so Nx targets
  the worktree instead of the main checkout.
- Inspect `apps/electron/project.json`, `apps/electron/package.json`, the workspace root
  `package.json`, `apps/electron/tsconfig.json`, `apps/electron/src/main.ts`, and
  `apps/electron/src/preload.ts`.
- Record the exact build output, resolved runtime paths, and a prioritized Story 83.3 fix list
  without changing production or configuration code.
- Run `pnpm all` after the documentation update to confirm the baseline remains unchanged.

### Debug Log References

- `/tmp/story-83-1-electron-build.log`

### Scratch Build Capture

- Command: `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm nx run electron:build`
- Exit code: `0`
- TypeScript failure capture: not applicable; `../../node_modules/.bin/tsc -p tsconfig.json`
  completed successfully.

```text
[@stylistic/eslint-plugin-js] This package is deprecated in favor of the unified @stylistic/eslint-plugin, please consider migrating to the main package

> nx run electron:build

> ../../node_modules/.bin/tsc -p tsconfig.json


 NX   Successfully ran target build for project electron


View logs and investigate cache misses at https://cloud.nx.app/runs/1BELaLsYAF
```

| Severity | Message                                                                                                                                                    | Origin file / package                                                                                                                                   | Hypothesis                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Minor    | `[@stylistic/eslint-plugin-js] This package is deprecated in favor of the unified @stylistic/eslint-plugin, please consider migrating to the main package` | `eslint.config.mjs` dynamically imports `@stylistic/eslint-plugin-js`, and the workspace root `package.json` declares that package in `devDependencies` | Nx initializes the workspace ESLint config during command startup, so the deprecation banner prints before the Electron compile output even though the Electron TypeScript build succeeds. |

### Completion Notes List

- `apps/electron/project.json` `build` target is compile-only: it runs `tsc -p tsconfig.json`,
  writes `apps/electron/dist`, and does not call `electron-builder` or
  `electron-packager`.
- `apps/electron/project.json` `start` depends on `server:build` and `dms-material:build`, but
  `build` does not, so `pnpm nx run electron:build` cannot produce a self-contained runnable app
  on its own.
- `apps/electron/package.json` `main` field (`dist/main.js`) matches the TypeScript output path,
  and the Electron runtime version is declared at the workspace root in `package.json`
  (`electron: ^41.0.0`).
- No `electron-builder`, `electron-packager`, or `electron-builder.yml` style config exists in
  the app or workspace, so there is no distributable creation path today.
- From `apps/electron/dist/main.js`, `path.join(__dirname, '../../../dist/apps/server/main.js')`
  resolves to `<workspace>/dist/apps/server/main.js`, which is correct for the current unpackaged
  workspace layout but not for an asar-packaged app.
- `win.loadURL('http://localhost:${port}')` assumes the packaged app will still launch a local
  Fastify server that can serve the Angular build output, so Story 83.3 needs to make that runtime
  model explicit.
- `apps/electron/src/preload.ts` compiles cleanly, and `webPreferences.preload` resolves to
  `apps/electron/dist/preload.js` as expected.
- `apps/electron/tsconfig.json` uses appropriate compile settings for Electron (`module:
  CommonJS`, `target: ES2020`, `outDir: dist`) and does not define `paths` or `baseUrl` overrides
  that would break import resolution.
- The current build emits `apps/electron/dist/utils/port.spec.js`, which shows the app build is
  compiling test files into the production dist folder.
- Current conclusion: `pnpm nx run electron:start` is the actual supported workflow right now;
  a full `electron-builder` style distributable has not yet been implemented.

### Prioritized Fix List For Story 83.3

| Severity | File                                                         | Problem                                                                                                                                                                                       | Proposed fix                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker  | `apps/electron/project.json`                                 | `build` only runs `tsc`; it does not depend on `server:build` / `dms-material:build` and does not package anything, so it cannot produce a distributable or self-contained runnable artifact. | Decide whether `electron:build` should remain a compile-only target or become the real distributable build. If distributable output is required, add explicit dependencies on the server/frontend builds plus a packaging target. |
| Blocker  | `apps/electron/package.json`, `package.json`, workspace root | No `electron-builder` / `electron-packager` dependency or packaging config exists anywhere in the repo.                                                                                       | Add `electron-builder` (or equivalent), app metadata, and packaging config, or explicitly rename/document the current compile-only target so it is not mistaken for a distributable build.                                        |
| Major    | `apps/electron/src/main.ts`                                  | `serverPath` is hard-coded to `../../../dist/apps/server/main.js`, which works from the unpackaged workspace layout but not from packaged `app.asar` / `resources` layouts.                   | Resolve packaged runtime paths from `process.resourcesPath` or an unpacked asset directory, and copy the server bundle into the packaged app layout.                                                                              |
| Major    | `apps/electron/src/main.ts`                                  | `win.loadURL` always targets `http://localhost:${port}`, so the runtime depends on a separately built Fastify + Angular deployment shape.                                                     | Decide the packaged runtime model: ship Fastify plus the built Angular assets together, or switch the renderer to a `file://` strategy while keeping API access local.                                                            |
| Minor    | `apps/electron/tsconfig.json`                                | The build emits `apps/electron/dist/utils/port.spec.js`, so test files are being compiled into the production dist folder.                                                                    | Add a build-only tsconfig or exclude `**/*.spec.ts` from the Electron build target.                                                                                                                                               |
| Minor    | `eslint.config.mjs`, `package.json`                          | Workspace startup prints a deprecated `@stylistic/eslint-plugin-js` warning before the Electron build output.                                                                                 | Migrate to `@stylistic/eslint-plugin` so Nx command startup is free of unrelated deprecation noise.                                                                                                                               |

### Validation Results

- `CI=1 NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm all`
  completed successfully. Affected lint ran for `dms-material-e2e` and reported 7 existing warnings
  in `seed-vol-column-e2e-data.helper.ts`, but no failures; affected build/test reported no failing
  tasks.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm e2e:dms-material:chromium`
  completed successfully after updating stale Universe-table e2e selectors to account for the added
  `Vol` column and the current `mat-column-*` cell classes.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm e2e:dms-material:firefox`
  completed successfully.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm dupcheck`
  completed successfully with 0 clones.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-1-audit-electron-build pnpm format`
  completed successfully.

## File List

- `_bmad-output/implementation-artifacts/83-1-audit-electron-build.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `apps/dms-material-e2e/src/cef-classification-symbol-add.spec.ts` (modified)
- `apps/dms-material-e2e/src/cusip-cache-admin.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-multi-column-sort-rows.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-resort-on-edit.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-secondary-sort.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-symbol-sort-empty-rows.spec.ts` (modified)
- `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` (modified)

## Change Log

- 2026-04-23: Captured the Electron build output, documented the current compile-only build shape,
  recorded the prioritized Story 83.3 fix list, and verified the `pnpm all` baseline remained
  unchanged for this documentation-only story.
- 2026-04-23: Repaired stale Universe e2e selectors and related test helpers during the required
  Phase 3 validation loop after Chromium validation exposed pre-existing failures caused by the
  added `Vol` column and outdated positional cell selectors.
