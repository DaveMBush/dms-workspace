# Story 77.1: Research and Scaffold Electron Package

Status: Approved

## Story

As a developer,
I want a new `apps/electron` package scaffolded with Electron and its required build tooling wired into the pnpm workspace,
so that subsequent stories have a stable foundation to build the main-process logic on.

## Acceptance Criteria

1. **Given** the pnpm workspace,
   **When** `pnpm install` is run after adding the Electron dependency,
   **Then** Electron is installed and `electron --version` executes without error.

2. **Given** the new `apps/electron` package,
   **When** `pnpm nx run electron:start` is executed,
   **Then** Electron launches and opens a blank BrowserWindow.

3. **Given** the workspace Nx config,
   **When** `pnpm all` runs,
   **Then** the new package is included and does not break existing targets.

4. **Given** the new package scaffolding,
   **When** a developer inspects `apps/electron/`,
   **Then** it contains `main.ts`, `preload.ts`, `package.json`, and `project.json` with `build` and `start` targets defined.

## Tasks / Subtasks

- [ ] Research current Electron packaging best practice (AC: #1)
  - [ ] Evaluate `electron-builder` vs `@electron-forge/cli` for this monorepo context
  - [ ] Check latest stable Electron version and confirm pnpm compatibility
  - [ ] Document chosen packaging tool in Dev Agent Record with rationale

- [ ] Create `apps/electron/` directory and base files (AC: #4)
  - [ ] Create `apps/electron/package.json` with `main: "dist/main.js"` and `electron` as devDependency
  - [ ] Create `apps/electron/tsconfig.json` extending `../../tsconfig.base.json` targeting `CommonJS` / Node
  - [ ] Create `apps/electron/src/main.ts` — minimal Electron main process that creates a blank BrowserWindow
  - [ ] Create `apps/electron/src/preload.ts` — empty contextBridge stub
  - [ ] Create `apps/electron/project.json` with `build` and `start` Nx targets

- [ ] Wire package into pnpm workspace (AC: #1)
  - [ ] Add `apps/electron` to `pnpm-workspace.yaml` packages list if not covered by existing glob
  - [ ] Run `pnpm install` from repo root and confirm it succeeds
  - [ ] Run `electron --version` (or `pnpm --filter electron exec electron --version`) and confirm it prints a version

- [ ] Define Nx `build` target (AC: #4)
  - [ ] Configure build target in `project.json` to compile `src/main.ts` and `src/preload.ts` to `dist/`
  - [ ] Use `@nx/js:tsc` executor or raw `tsc` command — whichever is simpler given monorepo conventions
  - [ ] Run `pnpm nx run electron:build` and confirm `dist/main.js` and `dist/preload.js` are produced

- [ ] Define Nx `start` target (AC: #2)
  - [ ] Configure `start` target in `project.json`: depends on `build`, then runs `electron .` in `apps/electron/`
  - [ ] Run `pnpm nx run electron:start` and confirm a blank BrowserWindow appears
  - [ ] Close window and confirm process exits cleanly

- [ ] Validate `pnpm all` still passes (AC: #3)
  - [ ] Run `pnpm all`
  - [ ] Confirm all existing unit tests and E2E tests continue to pass
  - [ ] Confirm the new `electron` project appears in the Nx project graph without errors
  - [ ] Record pass/fail in Dev Agent Record

## Dev Notes

### Overview

This story bootstraps the `apps/electron` Nx project from scratch. The goal is a minimal but
correctly wired scaffold — a blank BrowserWindow, TypeScript compilation, and clean Nx target
integration — so that Stories 77.2–77.5 can build on it without rework.

---

### Package Structure

```
apps/electron/
  src/
    main.ts        ← Electron main process entry
    preload.ts     ← contextBridge / IPC surface
  dist/            ← compiled output (gitignored)
  package.json
  tsconfig.json
  project.json
```

---

### Minimal `src/main.ts`

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL('about:blank');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

---

### Minimal `src/preload.ts`

```typescript
import { contextBridge } from 'electron';

// Expose IPC surface to renderer in later stories
contextBridge.exposeInMainWorld('electronAPI', {});
```

---

### `package.json` for `apps/electron`

```json
{
  "name": "electron",
  "version": "0.1.0",
  "main": "dist/main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "latest"
  }
}
```

> **Note:** Electron is a devDependency because it is not bundled into the final package output —
> the packaging tool (electron-builder or electron-forge) handles including it in the distributable.

---

### `project.json` Targets

```json
{
  "name": "electron",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/electron/src",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc -p tsconfig.json",
        "cwd": "apps/electron"
      }
    },
    "start": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "electron .",
        "cwd": "apps/electron"
      }
    }
  }
}
```

---

### `tsconfig.json` for `apps/electron`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src"]
}
```

> Electron's main process runs in Node.js, which requires `CommonJS` module format.
> Do NOT use ESM here without additional tooling.

---

### `pnpm-workspace.yaml`

The existing workspace file likely already covers `apps/*`. Verify it includes `apps/electron`:

```yaml
packages:
  - 'apps/*'
  - ...
```

If the glob already covers `apps/*`, no change is needed.

---

### Packaging Tool Research Guidance

Compare on these axes for this monorepo:
- **electron-forge**: tighter Nx integration, webpack/vite plugins available, first-party support
- **electron-builder**: mature, more config-driven, simpler for pure compile+package workflows

For this story, packaging tooling is **research only** — actual packaging (distributable builds)
is out of scope. The `start` target only needs `electron .` to work. Record the recommendation
in the Dev Agent Record for use in a future packaging story.

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Install all workspace packages | `pnpm install` |
| Check Electron version | `pnpm --filter electron exec electron --version` |
| Build electron package | `pnpm nx run electron:build` |
| Start Electron app | `pnpm nx run electron:start` |
| Run all tests | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/electron/src/main.ts` | Electron main process entry point |
| `apps/electron/src/preload.ts` | contextBridge / IPC surface |
| `apps/electron/project.json` | Nx project definition with build and start targets |
| `apps/electron/package.json` | Package metadata and Electron devDependency |
| `apps/electron/tsconfig.json` | TypeScript config targeting CommonJS/Node |
| `pnpm-workspace.yaml` | pnpm workspace package glob — verify `apps/*` is included |
| `nx.json` | Workspace-level Nx config — verify no exclusions affect new project |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
