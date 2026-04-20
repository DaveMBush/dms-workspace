# Story 77.3: Load Angular App in BrowserWindow and Configure Internal Routing

Status: Approved

## Story

As a developer,
I want the BrowserWindow to load the built Angular app and all Angular Router navigation to work correctly inside the Electron window,
so that users experience the same navigation as in a web browser without links escaping the window.

## Acceptance Criteria

1. **Given** the Angular app is built (`pnpm nx run dms-material:build`),
   **When** `pnpm nx run electron:start` launches,
   **Then** the BrowserWindow loads Angular's `index.html` from the build output and renders the app correctly.

2. **Given** the app loaded in the Electron window,
   **When** the user clicks any internal navigation link,
   **Then** Angular Router handles navigation within the same BrowserWindow without opening a new window or an external browser.

3. **Given** a hard page reload (Ctrl+R) inside the Electron window,
   **When** Electron handles the reload event,
   **Then** Angular routing rehydrates correctly without showing a 404 or blank page.

4. **Given** the app is loaded,
   **When** the Content Security Policy is applied,
   **Then** CSP allows Angular's required inline scripts while disallowing remote script execution from untrusted origins.

## Tasks / Subtasks

- [ ] Determine Angular build output path (AC: #1)
  - [ ] Inspect `apps/dms-material/project.json` or `angular.json` for the `build` target `outputPath`
  - [ ] Confirm the path to `index.html` (typically `dist/apps/dms-material/browser/index.html`)
  - [ ] Record exact path in Dev Agent Record

- [ ] Update `main.ts` to load the Angular app (AC: #1)
  - [ ] Replace `win.loadURL('about:blank')` with `win.loadURL('http://localhost:${port}')` since
        the app is served by the Fastify server (see Story 77.2 for port resolution)
  - [ ] Alternatively, if serving static files directly, use `win.loadFile(...)` — choose based on
        whether Fastify already serves the Angular static assets
  - [ ] Confirm the Angular app renders in the BrowserWindow after `pnpm nx run electron:start`

- [ ] Decide: serve via Fastify or load as file (AC: #1)
  - [ ] Check if Fastify already serves the `dist/apps/dms-material/browser/` directory as static assets
  - [ ] If yes: use `win.loadURL('http://localhost:${port}')` — preferred; avoids file-protocol routing issues
  - [ ] If no: configure Fastify to serve the Angular static files, or use `win.loadFile` with
        routing workaround; document choice in Dev Agent Record

- [ ] Configure `will-navigate` to keep internal navigation in-window (AC: #2)
  - [ ] Add `mainWindow.webContents.on('will-navigate', handleWillNavigate)` in `main.ts`
  - [ ] In `handleWillNavigate`: check if URL is within the local app origin; if it is, allow it;
        if it is external (http/https pointing away from localhost), prevent it
  - [ ] Confirm clicking all sidebar nav items keeps navigation within the same BrowserWindow

- [ ] Handle hard reload (Ctrl+R) for Angular routing (AC: #3)
  - [ ] If using `loadURL` with `http://localhost:PORT`: Angular is served from Fastify, so hard
        reload hits the server which returns `index.html`; no extra handling needed
  - [ ] If using `loadFile`: intercept reload and re-call `win.loadFile('index.html')` to prevent
        404 on reload of a deep-link URL
  - [ ] Test Ctrl+R on a deep route (e.g., `/universe`) and confirm app rehydrates correctly

- [ ] Set `webPreferences` with correct security defaults (AC: #4)
  - [ ] Ensure `nodeIntegration: false` and `contextIsolation: true` are set in BrowserWindow constructor
  - [ ] Set `webPreferences.preload` to the compiled `preload.js` path
  - [ ] Confirm `nodeIntegration: false` — the renderer must not have direct Node.js access

- [ ] Configure Content Security Policy (AC: #4)
  - [ ] Use `session.defaultSession.webRequest.onHeadersReceived` to inject a CSP header, OR
        verify the Angular app's `index.html` already contains a suitable CSP meta tag
  - [ ] CSP must allow: `'self'`, Angular's inline styles (`'unsafe-inline'` for styles only),
        and `http://localhost:PORT` for API calls
  - [ ] CSP must block: remote scripts from untrusted origins
  - [ ] Confirm in DevTools that no CSP violations are logged

- [ ] Update Nx `start` target to depend on Angular build (AC: #1)
  - [ ] Add `dms-material:build` to `electron:start` `dependsOn` in `project.json`
  - [ ] Run `pnpm nx run electron:start` and confirm Angular build runs first, then Electron starts

- [ ] Run `pnpm all` (AC: #1–#4)
  - [ ] Confirm all unit tests and E2E tests continue to pass
  - [ ] Record outcome in Dev Agent Record

## Dev Notes

### Serving Strategy: `loadURL` vs `loadFile`

**Preferred: `win.loadURL('http://localhost:${port}')`**

Since Story 77.2 wires up Fastify on a dynamic port, the simplest approach is to also configure
Fastify to serve the Angular static files from `dist/apps/dms-material/browser/`. This means
the renderer always talks to `http://localhost:PORT` — API calls and static assets share the
same origin, which eliminates file-protocol routing complications entirely.

Check `apps/server/src/main.ts` for static file serving. If it does not yet serve the Angular
output, add a Fastify static plugin:

```typescript
// In apps/server/src/main.ts
import fastifyStatic from '@fastify/static';
import path from 'path';

await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../../dist/apps/dms-material/browser'),
  prefix: '/',
  decorateReply: false,
});

// Fallback: serve index.html for all non-API routes (Angular routing)
fastify.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api/')) {
    return reply.sendFile('index.html');
  }
  reply.status(404).send({ error: 'Not found' });
});
```

> If `@fastify/static` is not yet installed, add it: `pnpm --filter server add @fastify/static`

---

### BrowserWindow Constructor with Security Settings

```typescript
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

win.loadURL(`http://localhost:${resolvedPort}`);
```

---

### `will-navigate` Handler

```typescript
function handleWillNavigate(event: Electron.Event, url: string): void {
  const localOrigin = `http://localhost:${resolvedPort}`;
  if (!url.startsWith(localOrigin)) {
    event.preventDefault();
    // External links handled in Story 77.4 via shell.openExternal
  }
}

mainWindow.webContents.on('will-navigate', handleWillNavigate);
```

---

### Hard Reload with `loadURL` Strategy

When using `loadURL('http://localhost:PORT')`, Fastify serves `index.html` for any unrecognised
path (via the fallback handler above). Ctrl+R reloads the current URL, Fastify returns
`index.html`, and Angular Router bootstraps and navigates to the correct route using the
browser's History API. No special Electron handling is required.

---

### CSP via Session Header Injection

```typescript
import { session } from 'electron';

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self' http://localhost:${resolvedPort}; ` +
          `script-src 'self'; ` +
          `style-src 'self' 'unsafe-inline'; ` +
          `img-src 'self' data:; ` +
          `connect-src 'self' http://localhost:${resolvedPort};`
        ],
      },
    });
  });
});
```

> Adjust the CSP after launching the app and inspecting DevTools Console for any CSP violations.
> The goal is the tightest policy that does not break the Angular app.

---

### Angular Build Output Path

Verify the actual output path before writing code. Look in `apps/dms-material/project.json`:

```json
"build": {
  "options": {
    "outputPath": "dist/apps/dms-material"
  }
}
```

Angular 17+ with the application builder puts the browser bundle at
`dist/apps/dms-material/browser/`. The `index.html` is at
`dist/apps/dms-material/browser/index.html`.

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Build Angular app | `pnpm nx run dms-material:build` |
| Build server | `pnpm nx run server:build` |
| Build electron | `pnpm nx run electron:build` |
| Start full Electron app | `pnpm nx run electron:start` |
| Run all tests | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/electron/src/main.ts` | BrowserWindow creation, `will-navigate` handler, CSP injection |
| `apps/electron/src/preload.ts` | contextBridge surface (port IPC added in Story 77.2) |
| `apps/electron/project.json` | Add `dms-material:build` and `server:build` to `start` dependsOn |
| `apps/server/src/main.ts` | Add `@fastify/static` and fallback `index.html` handler |
| `apps/dms-material/project.json` | Verify `outputPath` for Angular build |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
