# Electron App

This package wraps the built Angular client and the Fastify server in a desktop Electron shell.
The Electron main process starts the backend, waits for it to become healthy, and then opens a
single `BrowserWindow` at `http://localhost:<dynamic-port>`.

## Overview

- `apps/electron/src/main.ts` starts the Fastify server, configures the desktop window, injects
  the Content Security Policy, and intercepts navigation.
- `apps/electron/src/preload.ts` exposes `window.electronAPI.getApiPort()` to the renderer.
- `apps/electron/src/utils/port.ts` finds an unused local TCP port before Fastify starts.
- `apps/electron/project.json` defines the Nx `build`, `start`, and `test` targets.

The Angular app is not bundled directly into Electron. Instead, the Fastify server serves the
built Angular browser assets from `dist/apps/dms-material/browser`, and Electron loads that app
through `http://localhost:<port>`.

## Architecture

At startup, the Electron main process follows this sequence:

1. Call `findAvailablePort()` to reserve an unused local port.
2. Fork `dist/apps/server/main.js` with `PORT=<port>`.
3. Wait for the server to send a `ready` IPC message.
4. Run an HTTP health check against `http://127.0.0.1:<port>/api/health`.
5. Create a `BrowserWindow` and load `http://localhost:<port>`.

That flow lives in `apps/electron/src/main.ts`. The server-side static file handling lives in
`apps/server/src/main.ts`, where Fastify serves the Angular build output and falls back to
`index.html` for non-API routes.

## Prerequisites

- Node.js `^22.0.0` (workspace root `package.json`)
- pnpm `^10`
- Electron `^41.0.0` (workspace root `package.json`; current installed version may be newer
  within that range)

From a clean checkout:

```bash
pnpm install
pnpm exec prisma generate
```

`prisma generate` is recommended before builds and validations because the workspace only runs it
automatically in CI.

## Development

Use the Nx start target for the normal development workflow:

```bash
pnpm nx run electron:start
```

What this target does:

- Builds the Electron main/preload scripts (`electron:build`)
- Builds the Fastify server (`server:build`)
- Builds the Angular app (`dms-material:build`)
- Runs `electron .` from `apps/electron`

You do not need to build Angular manually before `electron:start`; the target already depends on
the Angular and server build targets.

## Build

Compile the Electron package with:

```bash
pnpm nx run electron:build
```

Current behavior of `electron:build`:

- Runs `tsc -p tsconfig.json` from `apps/electron`
- Writes compiled files to `apps/electron/dist`
- Produces `apps/electron/dist/main.js` and `apps/electron/dist/preload.js`
- Does **not** create an installer or packaged desktop distributable yet

If you want to run the compiled Electron entry after building, also build the server and Angular
outputs first, then launch Electron from the package directory:

```bash
pnpm nx run server:build
pnpm nx run dms-material:build
pnpm nx run electron:build
pnpm --dir apps/electron start
```

Important limitation: the repository does not currently include `electron-builder`,
`electron-packager`, or equivalent packaging configuration. Today, `electron:build` is a
compile-only build, not a true distributable packaging step.

## BrowserWindow Configuration

`createWindow()` in `apps/electron/src/main.ts` creates a single desktop window with these
security-relevant settings:

```ts
const win = new BrowserWindow({
  width: 1280,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  },
});
```

- `preload` points to the compiled preload script at `apps/electron/dist/preload.js`
- `nodeIntegration: false` keeps Node.js APIs out of the renderer
- `contextIsolation: true` keeps the preload bridge isolated from the web page
- `sandbox: true` adds another renderer isolation layer

The window loads the Angular app via:

```ts
win.loadURL(`http://localhost:${port}`);
```

## Angular Router Handling

Electron uses two navigation hooks to keep the Angular app inside the same window:

- `win.webContents.on('will-navigate', ...)`
- `win.webContents.setWindowOpenHandler(...)`

Behavior:

- Same-origin URLs matching `http://localhost:<port>` are treated as internal app navigation.
- External URLs are prevented from navigating inside Electron.
- `window.open()` calls for same-origin URLs are redirected back into the existing window with
  `win.loadURL(details.url)`.
- New window creation is always denied by returning `{ action: 'deny' }`.

Angular Router itself uses the History API for normal SPA navigation, so most route changes do not
trigger `will-navigate`. The Electron handlers matter for full-page navigations, reloads, and
`window.open()` behavior.

## Internal vs External Links

The helper `isLocalAppUrl()` in `apps/electron/src/main.ts` treats only
`http://localhost:<port>` as internal.

- Internal same-origin links stay in the Electron window.
- External `http:` and `https:` links are opened with `shell.openExternal(url)`.
- External navigation is prevented inside the `BrowserWindow`.

This keeps the app in a single desktop window while still allowing documentation, auth, or other
external URLs to open in the system browser.

## IPC / Preload API

The preload script exposes a single renderer API:

```ts
window.electronAPI.getApiPort(): Promise<number>
```

Implementation details:

- `apps/electron/src/preload.ts` calls `ipcRenderer.invoke('get-api-port')`
- `apps/electron/src/main.ts` registers `ipcMain.handle('get-api-port', ...)`
- The resolved port is stored in the main process after `findAvailablePort()` succeeds

This allows the Angular app to discover the dynamic backend port when running under Electron.

## Content Security Policy

Electron injects the Content Security Policy in `apps/electron/src/main.ts` using
`session.defaultSession.webRequest.onHeadersReceived(...)`.

The injected policy allows:

- `default-src 'self' http://localhost:<port>`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data: https:`
- `connect-src 'self' http://localhost:<port>` plus the configured AWS Cognito endpoints

This keeps the Angular app functional while avoiding remote script execution from untrusted
origins.

## Testing

Electron-specific Nx targets:

```bash
pnpm nx run electron:test
pnpm nx run electron:build
pnpm nx run electron:start
```

Notes:

- `electron:test` currently uses `passWithNoTests: true`
- `electron:start` is the supported end-to-end developer workflow
- `pnpm all` should continue to pass after documentation changes

## Source References

- `apps/electron/src/main.ts`
- `apps/electron/src/preload.ts`
- `apps/electron/src/utils/port.ts`
- `apps/electron/project.json`
- `apps/electron/package.json`
- `apps/electron/tsconfig.json`
- `apps/server/src/main.ts`
- `apps/dms-material/project.json`
