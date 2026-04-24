# Story 83.2: Write Electron App Documentation

Status: Review

## Story

As Dave,
I want clear documentation describing how the Electron app wraps the Angular client and how to
build and run the distributable,
so that any developer (or future AI agent) can understand, maintain, and extend the Electron
integration without having to reverse-engineer it from the source.

## Acceptance Criteria

1. **Given** the `apps/electron` package,
   **When** a new `apps/electron/README.md` file is created,
   **Then** the documentation covers at minimum:

   - Prerequisites (Node version, pnpm, Electron version)
   - How to build the Angular app before launching Electron
   - How to run the app in development (`pnpm nx run electron:start`)
   - How to produce a distributable build (`pnpm nx run electron:build`)
   - How the `BrowserWindow` is configured to load the Angular app via the Fastify server
   - How Angular Router navigation is handled inside the window (via `will-navigate`
     interception and `setWindowOpenHandler`)
   - How internal links stay in-window and external links open in the system browser

2. **Given** the documentation is written,
   **When** a developer follows the instructions from a clean checkout,
   **Then** the steps are accurate and sufficient to build and launch the Electron app without
   additional research.

3. **Given** the documentation is committed,
   **When** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Read all Electron source files to ensure documentation accuracy (AC: #1, #2)

  - [x] Read `apps/electron/src/main.ts` — understand BrowserWindow config, server fork,
        link interception, health check, and CSP setup
  - [x] Read `apps/electron/src/preload.ts` — understand contextBridge / `electronAPI`
        exposure
  - [x] Read `apps/electron/src/utils/port.ts` — understand dynamic port selection
  - [x] Read `apps/electron/project.json` — document `build`, `start`, and `test` targets
  - [x] Read `apps/electron/package.json` — note `main` field and `start` script
  - [x] Read `apps/electron/tsconfig.json` — note compilation output directory

- [x] Task 2: Read Epic 77 story files for historical context (AC: #2)

  - [x] Read `_bmad-output/implementation-artifacts/77-1-research-electron-setup.md`
  - [x] Read `_bmad-output/implementation-artifacts/77-2-launch-fastify-in-electron.md`
  - [x] Read `_bmad-output/implementation-artifacts/77-3-configure-electron-window.md`
  - [x] Read `_bmad-output/implementation-artifacts/77-4-intercept-api-and-external-links.md`
  - [x] Read `_bmad-output/implementation-artifacts/77-5-e2e-electron-launch.md`
  - [x] Note any design decisions or known limitations documented in these files

- [x] Task 3: Read Story 83.1 findings to include accurate build information (AC: #1, #2)

  - [x] Read `_bmad-output/implementation-artifacts/83-1-audit-electron-build.md` —
        specifically the Dev Agent Record section with build findings
  - [x] Ensure the documentation reflects the actual working state of the build, not
        aspirational state
  - [x] If `electron-builder` distributable packaging is not yet set up (per Story 83.1),
        note this limitation clearly in the README

- [x] Task 4: Create `apps/electron/README.md` (AC: #1)

  - [x] Create the file at `apps/electron/README.md`
  - [x] Include all sections listed in AC #1:
    - **Overview**: what the Electron app does (wraps Angular+Fastify in a desktop window)
    - **Architecture**: how main process forks Fastify, finds a free port, opens BrowserWindow
      at `http://localhost:<port>`, and intercepts navigation
    - **Prerequisites**: Node 22+, pnpm 10+, Electron (version from `package.json`)
    - **Development**: `pnpm nx run electron:start` (depends on server:build + dms-material:build)
    - **Build**: `pnpm nx run electron:build` — what it produces, how to run it
    - **BrowserWindow Configuration**: `webPreferences` (nodeIntegration: false,
      contextIsolation: true, sandbox: true, preload path)
    - **Angular Router Handling**: `will-navigate` prevents external navigation;
      `setWindowOpenHandler` keeps same-origin navigations in-window
    - **External Links**: `shell.openExternal()` opens http/https links in system browser
    - **IPC / preload API**: `window.electronAPI.getApiPort()` — how the Angular app
      discovers the dynamic API port
    - **Content Security Policy**: CSP header injection via `onHeadersReceived`
    - **Testing**: `pnpm nx run electron:test` (passWithNoTests currently)
  - [x] Use clear headings, code blocks for all commands, and inline references to source
        files where relevant

- [x] Task 5: Review documentation for accuracy against source code (AC: #2)

  - [x] Cross-check every stated file path, command, and config value against the actual
        source code
  - [x] Verify the Angular route URL used to launch (`http://localhost:<port>`) matches what
        `createWindow()` calls
  - [x] Verify the preload path in `webPreferences` matches the actual compiled output location

- [x] Task 6: Run `pnpm all` to confirm all tests pass (AC: #3)

  - [x] Run `pnpm all`
  - [x] Confirm no new failures — adding a markdown file should not break anything

## Dev Notes

### Architecture Summary (for README accuracy)

The Electron app does **not** bundle the Angular frontend. Instead:

1. `main.ts` calls `findAvailablePort()` to claim a free TCP port dynamically
2. It forks the Fastify server (`dist/apps/server/main.js`) with `PORT=<port>` via `fork()`
3. It waits for a `'ready'` IPC message from the server, then runs an HTTP health check
4. `createWindow(port)` opens a `BrowserWindow` loading `http://localhost:<port>`
5. The Fastify server serves both the API (`/api/*`) and the Angular static files from its
   own `dist/` output

### Navigation Handling (for README accuracy)

Two interception points prevent navigation from breaking the SPA:

- `win.webContents.on('will-navigate', handleWillNavigate)`: cancels any navigation to a
  non-localhost URL and opens it externally; same-origin navigations are allowed through
- `win.webContents.setWindowOpenHandler(...)`: handles `window.open()` calls; same-origin
  URLs are loaded in the existing window, not a new window; external URLs are opened in the
  system browser; new window creation is always denied (`action: 'deny'`)

### Preload / IPC (for README accuracy)

`preload.ts` exposes `window.electronAPI.getApiPort()` which calls
`ipcRenderer.invoke('get-api-port')`. The main process registers this handler in `init()`:

```typescript
ipcMain.handle('get-api-port', function getApiPort(): number | null {
  return resolvedPort;
});
```

The Angular app uses this to build API URLs dynamically (when running under Electron).

### Key Source Files

| File                              | Content                                    |
| --------------------------------- | ------------------------------------------ |
| `apps/electron/src/main.ts`       | Full main process logic                    |
| `apps/electron/src/preload.ts`    | contextBridge API surface                  |
| `apps/electron/src/utils/port.ts` | Dynamic port selection                     |
| `apps/electron/project.json`      | Nx targets: build, start, test             |
| `apps/electron/package.json`      | Entry point (`dist/main.js`), start script |

### Key Commands

```bash
# Run the full test suite after adding README
pnpm all

# View the electron project targets
pnpm nx show project electron

# Check current electron version
node -e "const p=require('./node_modules/electron/package.json'); console.log(p.version)"
```

### References

- [Source: apps/electron/src/main.ts]
- [Source: apps/electron/src/preload.ts]
- [Source: apps/electron/project.json]
- [Source: _bmad-output/implementation-artifacts/83-1-audit-electron-build.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-832]

## Dev Agent Record

### Agent Model Used

GitHub Copilot (GPT-5.4)

### Implementation Plan

- Read the Electron source, Epic 77 story history, and Story 83.1 findings before writing any
  documentation so the README reflects the actual runtime model.
- Document the supported developer workflow (`electron:start`) and the current compile-only state
  of `electron:build`.
- Validate the workspace after the documentation change with the full quality-validation workflow.

### Debug Log References

- `pnpm i` completed successfully in `/home/dave/code/dms/story-83-2-electron-documentation`
- `pnpm exec prisma generate` completed successfully in the story worktree
- `CI=1 NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-2-electron-documentation pnpm all` completed successfully
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-2-electron-documentation pnpm e2e:dms-material:chromium` completed successfully
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-2-electron-documentation pnpm e2e:dms-material:firefox` completed successfully
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-2-electron-documentation pnpm dupcheck` completed successfully
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-83-2-electron-documentation pnpm format` completed successfully

### Completion Notes List

- Added `apps/electron/README.md` covering architecture, development, build behavior, navigation,
  preload IPC, CSP, and testing.
- Documented the current limitation that `electron:build` compiles TypeScript only and does not
  yet package a true distributable.
- Re-ran the full quality-validation loop and confirmed `pnpm all`, browser E2E, dupcheck, and
  format all pass in the story worktree.

### File List

- `apps/electron/README.md` (new)
- `_bmad-output/implementation-artifacts/83-2-electron-documentation.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-04-23: Added first-party Electron app documentation and recorded the current compile-only
  build limitation identified in Story 83.1.
