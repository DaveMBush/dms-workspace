# Story 83.3: Fix the Electron Build Process

Status: Approved

## Story

As a developer,
I want `pnpm nx run electron:build` to complete successfully and produce a distributable that
launches the Angular app in a `BrowserWindow`,
so that the Electron integration created in Epic 77 is actually usable for distribution.

## Acceptance Criteria

1. **Given** the fix list from Story 83.1,
   **When** the developer applies the identified fixes to `apps/electron` configuration and
   source files,
   **Then** `pnpm nx run electron:build` exits with code 0 and produces output in
   `apps/electron/dist/`.

2. **Given** the built output,
   **When** `pnpm nx run electron:start` is executed (which depends on `electron:build`,
   `server:build`, and `dms-material:build`),
   **Then** the Electron window opens, the Angular app renders, and Angular Router navigation
   works correctly within the window.

3. **Given** the Playwright MCP server is used to verify the running app,
   **When** a sidebar navigation item is clicked,
   **Then** the router navigates to the correct screen within the same window without opening
   a new window or external browser.

4. **Given** the build fix is applied,
   **When** `pnpm all` is run,
   **Then** all tests pass, including any Electron E2E tests introduced in Epic 77.

## Tasks / Subtasks

- [ ] Task 1: Read Story 83.1 Dev Agent Record for the prioritised fix list (AC: #1)
  - [ ] Read `_bmad-output/implementation-artifacts/83-1-audit-electron-build.md` — Dev
        Agent Record section
  - [ ] List every issue to be fixed before writing any code
  - [ ] Confirm the `build` target currently only compiles TypeScript (no packaging)
  - [ ] Decide scope: fix TypeScript compilation errors first; packaging (electron-builder)
        is a separate sub-task

- [ ] Task 2: Fix TypeScript compilation errors (AC: #1)
  - [ ] If `tsc -p tsconfig.json` fails with errors, address each one in turn
  - [ ] Common issues: incorrect module settings, missing type declarations, path alias
        problems
  - [ ] Check `apps/electron/tsconfig.json` — ensure `module: "CommonJS"` (Electron main
        process requires CommonJS, not ESM)
  - [ ] After each fix, rerun `pnpm nx run electron:build` to confirm progress
  - [ ] Do not change logic in `main.ts` / `preload.ts` unless a TypeScript error forces it

- [ ] Task 3: Verify compiled output is runnable (AC: #2)
  - [ ] After `pnpm nx run electron:build` exits 0, confirm `apps/electron/dist/main.js`
        and `apps/electron/dist/preload.js` exist
  - [ ] Confirm `apps/electron/dist/utils/` directory exists with `port.js`
  - [ ] Check that `apps/electron/package.json` `"main": "dist/main.js"` points to the
        compiled file correctly

- [ ] Task 4: Test `pnpm nx run electron:start` (AC: #2)
  - [ ] Ensure the Fastify server is built: `pnpm nx run server:build`
  - [ ] Ensure dms-material is built: `pnpm nx run dms-material:build`
  - [ ] Run `pnpm nx run electron:start`
  - [ ] Confirm the Electron window opens and the Angular app renders
  - [ ] Navigate between routes in the sidebar — confirm navigation stays in-window

- [ ] Task 5: Use Playwright MCP server to verify navigation (AC: #3)
  - [ ] Start the Electron app (`pnpm nx run electron:start`)
  - [ ] Open Playwright MCP server against the running Electron window
  - [ ] Navigate to Universe screen, Open Positions, and at least one other route
  - [ ] Confirm each navigation loads the correct screen in the same window
  - [ ] Confirm clicking a known external link opens in the system browser, not in-window
  - [ ] Document Playwright MCP findings in Dev Agent Record

- [ ] Task 6: Update `apps/electron/README.md` if configuration changed (AC: #1, #2)
  - [ ] If any configuration values changed during the fix (e.g., tsconfig settings,
        project.json commands), update `apps/electron/README.md` to reflect the final state
  - [ ] Ensure documentation in Story 83.2 is accurate for the fixed build

- [ ] Task 7: Run `pnpm all` and confirm all tests pass (AC: #4)
  - [ ] Run `pnpm all` from the workspace root
  - [ ] Confirm all previously passing tests still pass
  - [ ] Confirm any Electron E2E tests from Epic 77 pass (check
        `apps/dms-material-e2e/src/` for electron-related specs)

## Dev Notes

### Prerequisite: Story 83.1

This story depends on Story 83.1. Read the Dev Agent Record section of
`_bmad-output/implementation-artifacts/83-1-audit-electron-build.md` before making any
changes. Do not guess at what is broken — use the audit findings.

### Current Build Target (as of Epic 83.1 baseline)

```json
"build": {
  "executor": "nx:run-commands",
  "outputs": ["{workspaceRoot}/apps/electron/dist"],
  "options": {
    "command": "../../node_modules/.bin/tsc -p tsconfig.json",
    "cwd": "apps/electron"
  }
}
```

This compiles TypeScript only. A full distributable would require `electron-builder` — but
that is likely out of scope unless Story 83.1 identified this as a blocker. The primary goal
is that `pnpm nx run electron:start` works end-to-end.

### Key Architecture Constraint

The `serverPath` in `main.ts` is hardcoded:
```typescript
const serverPath = path.join(__dirname, '../../../dist/apps/server/main.js');
```
When running from `apps/electron/dist/main.js`, `__dirname` is `<workspace>/apps/electron/dist`.
`../../../` resolves to `<workspace>/`. So `dist/apps/server/main.js` → `<workspace>/dist/apps/server/main.js`.
This is the correct path for an Nx monorepo workspace where `server:build` outputs to
`dist/apps/server/main.js`. **Do not change this path unless Story 83.1 identified it as wrong.**

### TypeScript Configuration to Check

Electron main process requires CommonJS modules. Verify `apps/electron/tsconfig.json` has:
```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "outDir": "dist",
    "moduleResolution": "node"
  }
}
```
If `module` is set to `ESNext` or `Node16`/`Node18`, Electron may fail to load the main file.

### Angular App Loading

The Angular app is served by the Fastify server, not loaded as a `file://` URL. This is
intentional — the Angular app makes API calls to the same origin, so `http://localhost:<port>`
works for both the app shell and API calls. **Do not change to `file://` loading.**

### Playwright MCP Verification

The Playwright MCP server can connect to Electron's BrowserWindow if the devtools are
accessible. Alternatively, verify manually that:
1. Electron window opens
2. Angular app renders (Universe screen or login page)
3. Clicking nav items navigates without opening a new window

### Key Commands

```bash
# Fix TypeScript compilation
pnpm nx run electron:build

# Start the full stack (builds server + dms-material first)
pnpm nx run electron:start

# Run all tests
pnpm all

# Check Electron E2E tests exist
ls apps/dms-material-e2e/src/ | grep -i electron
```

### References

- [Source: apps/electron/project.json]
- [Source: apps/electron/src/main.ts]
- [Source: apps/electron/tsconfig.json]
- [Source: _bmad-output/implementation-artifacts/83-1-audit-electron-build.md]
- [Source: _bmad-output/implementation-artifacts/83-2-electron-documentation.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-833]
