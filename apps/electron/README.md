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
- Runs the app-local `pnpm start` launcher from `apps/electron`, which clears any inherited
  `ELECTRON_RUN_AS_NODE` override before spawning Electron and enables Electron mock auth by
  default for non-production launches unless `DMS_ENABLE_MOCK_AUTH` is already set

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

The package `start` script also clears any inherited `ELECTRON_RUN_AS_NODE` override before
launching Electron so the main process does not accidentally boot in plain Node mode. For local
developer launches it also defaults `DMS_ENABLE_MOCK_AUTH=1` unless the caller already provided a
value or `NODE_ENV=production`.

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
- `script-src 'self' 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data: https:`
- `connect-src 'self' http://localhost:<port>` plus the configured AWS Cognito endpoints

The script hash is currently required for an Angular-generated inline startup handler in the built
app. This keeps the Angular app functional while still avoiding remote script execution from
untrusted origins.

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

## Packaging & Smoke Test

After packaging, you can verify the AppImage starts correctly and the embedded server
becomes healthy using the smoke-test target.

### Build the distributable

```bash
pnpm nx run electron:package
```

This runs `electron-builder` and writes the AppImage (and `.deb`) to
`dist/electron-dist/`.

### Run the smoke test

```bash
pnpm nx run electron:smoke-test
```

What the smoke test does:

1. Finds the `*.AppImage` in `dist/electron-dist/`.
2. Launches it with `--no-sandbox` and a temporary `--user-data-dir` so the dev
   database is not touched.
3. On headless CI (no `DISPLAY` set), wraps the launch with
   `xvfb-run --auto-servernum`.
4. Sets `DMS_SMOKE_PORT=3000` so the embedded Fastify server binds to a
   predictable port instead of a random one (see `apps/electron/src/main.ts`).
5. Polls `http://localhost:3000/api/health` for up to 30 seconds.
6. Exits **0** if the server returns HTTP 200; exits **1** on timeout or error.

### Required environment

| Variable             | Default         | Purpose                                                      |
| -------------------- | --------------- | ------------------------------------------------------------ |
| `DMS_NODE_EXEC_PATH` | `$(which node)` | Node binary the packaged app uses to fork the server process |
| `DMS_SMOKE_PORT`     | `3000`          | Fixed port used during the smoke test                        |
| `DISPLAY`            | _(unset)_       | When unset, `xvfb-run` is used automatically                 |

> **Note:** `DMS_NODE_EXEC_PATH` must point to a plain Node.js binary, not the Electron
> binary. The packaged Electron app forks the server as a separate Node process, and the
> fork will fail if the wrong executable is used. In most CI environments `$(which node)`
> is correct.

## Source References

- `apps/electron/src/main.ts`
- `apps/electron/src/preload.ts`
- `apps/electron/src/utils/port.ts`
- `apps/electron/project.json`
- `apps/electron/package.json`
- `apps/electron/tsconfig.json`
- `apps/server/src/main.ts`
- `apps/dms-material/project.json`

## Database Migrations on Launch

The packaged Electron app applies any pending Prisma migrations automatically at startup,
before the Fastify server is forked.  This allows users to install a new app version on a
machine that has **no Node, npm, or pnpm toolchain** and have their `~/.dms/dms.db` schema
upgraded automatically.

### Chosen approach: embedded Prisma schema-engine binary (preferred path)

Prisma 7 ships a standalone native binary called **schema-engine** (e.g.
`schema-engine-debian-openssl-3.0.x` on Linux, `schema-engine-darwin-arm64` on Apple
Silicon, `schema-engine-windows.exe` on Windows).  The binary acts as a JSON-RPC server
over stdio when invoked without a subcommand; no JS wrapper or Node runtime on the user's
PATH is required.

At package time, `electron-builder.yml` copies the platform-appropriate binary from
`node_modules/.pnpm/node_modules/@prisma/engines/schema-engine-*` into
`<resourcesPath>/prisma-migration-engine/`.

At runtime, `apps/electron/src/utils/run-migrations.ts` (function `runMigrationsPackaged`):

1. Resolves the binary path: `<resourcesPath>/prisma-migration-engine/<platform-binary>`.
2. Spawns the binary with:
   - `--datamodels <resourcesPath>/prisma/schema.prisma` — points to the bundled schema.
   - `--datasource '{"url":"<DATABASE_URL>"}'` — passes the database URL (already set by
     the `db-path` helper before migrations run).
3. Sends a single JSON-RPC `applyMigrations` request to the binary's stdin with
   `migrationsDirectoryPath` pointing at `<resourcesPath>/prisma/migrations/`.
4. Reads the JSON-RPC response from stdout.  An `error` field in the response causes the
   promise to reject; a `result` field (even with `appliedMigrationNames: []`) resolves.
5. On non-zero exit the promise rejects regardless of the JSON response.

On failure, `apps/electron/src/main.ts` surfaces a `dialog.showErrorBox(...)` and calls
`app.exit(1)` — the Fastify server is never forked with a stale or partial schema.

### Development path (unchanged)

During development (`app.isPackaged === false`) the standard `prisma migrate deploy
--schema=<path>` CLI invocation is used, which requires Node on the developer's machine.
The dev loop is regression-protected and unaffected by the packaging changes.

### Updating bundled migration files

When a new Prisma migration is added (`pnpm exec prisma migrate dev --name ...`), the
generated directory under `prisma/migrations/` is automatically included in the next
packaged build because `electron-builder.yml` copies the entire `prisma/migrations/`
directory tree into `extraResources`.  No manual step is required beyond committing the
new migration files to the repository.

### Binary fallback note

The embedded schema-engine approach was confirmed viable on the current target platforms.
The alternative "fresh DB + SQLite-only copy" fallback (described in story 98.2 Dev Notes)
was **not** implemented because the embedded binary communicates cleanly via JSON-RPC
without any Node dependency.
