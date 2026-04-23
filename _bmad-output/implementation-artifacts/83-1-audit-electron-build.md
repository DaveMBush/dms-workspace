# Story 83.1: Audit and Document Current Electron Build Failures

Status: Approved

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

- [ ] Task 1: Run the Electron build and capture all output (AC: #1)
  - [ ] Run `pnpm nx run electron:build` from the workspace root
  - [ ] Capture the full terminal output — every error, warning, and info line
  - [ ] Note the exit code of the command
  - [ ] If the TypeScript compilation step (`tsc -p tsconfig.json`) fails, save the full `tsc`
        error output separately
  - [ ] Document results in a scratch section at the bottom of this story file under
        "Dev Agent Record"

- [ ] Task 2: Review `apps/electron/project.json` for build target completeness (AC: #2)
  - [ ] Read `apps/electron/project.json` — note the `build` target uses only `tsc` with
        no packaging step
  - [ ] Confirm: the `build` target does **not** invoke `electron-builder` or
        `electron-packager` — there is no distributable creation step
  - [ ] Confirm: the `start` target depends on `server:build` and `dms-material:build` but
        `build` does not — is this intentional?
  - [ ] Document all gaps between what the current `build` target does vs. what is needed for
        a distributable

- [ ] Task 3: Review `apps/electron/package.json` for missing fields (AC: #2)
  - [ ] Check for `electron-builder` or `electron-packager` in `devDependencies`
  - [ ] Check workspace root `package.json` for `electron-builder`/`electron-packager`
  - [ ] Check `main` field — currently `"main": "dist/main.js"`, confirm this is the correct
        path relative to the package root after TypeScript compilation
  - [ ] Check if `electron` version is declared (direct or in root `package.json`)
  - [ ] Document any missing dependencies or misconfigured fields

- [ ] Task 4: Review `apps/electron/src/main.ts` for runtime path issues (AC: #2)
  - [ ] Read `main.ts` — specifically the `serverPath` construction:
        `path.join(__dirname, '../../../dist/apps/server/main.js')`
  - [ ] Verify this relative path is correct when running from `apps/electron/dist/main.js`
        (it would resolve to `<workspace>/dist/apps/server/main.js`)
  - [ ] Note that for an asar-packaged Electron app, `__dirname` resolves differently inside
        the archive — document this as a risk for Story 83.3
  - [ ] Check `win.loadURL` — currently loads `http://localhost:${port}` which works for
        development but a true distributable might need `file://` loading of Angular static
        files instead

- [ ] Task 5: Review `apps/electron/tsconfig.json` for compilation configuration (AC: #1)
  - [ ] Read `apps/electron/tsconfig.json`
  - [ ] Confirm `module`, `target`, `outDir` settings are appropriate for Electron (Node.js
        CommonJS or ESM)
  - [ ] Note any TypeScript errors that would prevent compilation
  - [ ] Confirm `paths` or `baseUrl` settings do not cause import resolution failures

- [ ] Task 6: Review `apps/electron/src/preload.ts` (AC: #2)
  - [ ] Confirm preload compiles cleanly
  - [ ] Check `contextBridge.exposeInMainWorld` usage is correct
  - [ ] Note the compiled output path and confirm `webPreferences.preload` in `main.ts`
        points to the correct compiled file

- [ ] Task 7: Produce a prioritised fix list for Story 83.3 (AC: #1, #2)
  - [ ] List all discovered issues ranked by severity (blocker / major / minor)
  - [ ] For each issue: state the file, the problem, and the proposed fix
  - [ ] Write this list in the Dev Agent Record section at the bottom of this file
  - [ ] Identify whether a full `electron-builder` distributable is needed for "build" or
        whether `pnpm nx run electron:start` is the primary use case

- [ ] Task 8: Verify `pnpm all` baseline is unchanged (AC: #3)
  - [ ] Run `pnpm all` — confirm all previously passing tests still pass
  - [ ] Electron build failures are expected and acceptable at this stage
  - [ ] No application code was changed in this story

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

| File | Purpose |
| ---- | ------- |
| `apps/electron/project.json` | Build/start/test targets |
| `apps/electron/package.json` | Entry point, scripts, dependencies |
| `apps/electron/tsconfig.json` | TypeScript compilation config |
| `apps/electron/src/main.ts` | Main process — BrowserWindow, server fork, link handling |
| `apps/electron/src/preload.ts` | Preload script — contextBridge |
| `apps/electron/src/utils/port.ts` | Dynamic port finder |

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
