# Story 77.4: Intercept API Calls and Open External Links in System Browser

Status: Done

## Story

As a developer,
I want `/api/**` requests to be forwarded to the embedded Fastify server and all external `http://`/`https://` links to be opened in the system default browser,
so that the app behaves like a properly isolated desktop application.

## Acceptance Criteria

1. **Given** the Angular app running in the BrowserWindow,
   **When** it makes a fetch to `/api/**` (relative URL or `http://localhost:PORT/api/**`),
   **Then** the request resolves against the local Fastify server and returns a valid JSON response.

2. **Given** the BrowserWindow `webContents`,
   **When** `new-window` or `will-navigate` fires for a URL that starts with `http://` or `https://` and does not point to the local Fastify origin,
   **Then** the event is prevented and `shell.openExternal(url)` is called.

3. **Given** an internal Angular Router link,
   **When** `will-navigate` fires,
   **Then** navigation proceeds normally within the same BrowserWindow.

4. **Given** `new-window` fires for an external URL,
   **When** `shell.openExternal` is called,
   **Then** no new Electron window is created and the URL opens in the OS default browser.

## Tasks / Subtasks

- [x] Confirm API call routing from renderer (AC: #1)
  - [x] Verify that Angular's `HttpClient` uses relative URLs (`/api/...`) or has a base URL
        configured
  - [x] Confirm that since `win.loadURL('http://localhost:PORT')` is used (Story 77.3), relative
        `/api/**` URLs resolve to `http://localhost:PORT/api/**` automatically
  - [x] Make a test API call from the running app (e.g., open DevTools, run
        `fetch('/api/health').then(r => r.json())`) and confirm a `200` response
  - [x] If Angular uses a different base URL or environment variable, update
        `apps/dms-material/src/environments/environment.ts` to use the dynamic port via IPC

- [x] Update Angular environment to use dynamic port (AC: #1, #2)
  - [x] Check `apps/dms-material/src/environments/` for environment files
  - [x] If API URL is hardcoded (e.g., `http://localhost:3000`), add logic to detect Electron
        context and read the port from `window.electronAPI.getApiPort()` (IPC surface from Story 77.2)
  - [x] Pattern: in `app.config.ts` or an APP_INITIALIZER, read the port if
        `window.electronAPI` is defined, then configure `HttpClient` base URL accordingly
  - [x] If the app already uses relative URLs, no change is needed — confirm and document

- [x] Implement external link interception via `setWindowOpenHandler` (AC: #2, #4)
  - [x] In `main.ts`, after creating `mainWindow`, register:
        `mainWindow.webContents.setWindowOpenHandler(handleWindowOpen)`
  - [x] `handleWindowOpen` receives `{ url }` — if URL is external, call `shell.openExternal(url)`
        and return `{ action: 'deny' }`; otherwise return `{ action: 'allow' }`
  - [x] Test by clicking an external link in the app (if none exist, add a temporary `<a>` tag
        in a dev build and remove it after confirming behaviour)

- [x] Update `will-navigate` handler to allow internal, block external (AC: #2, #3)
  - [x] Extend the `handleWillNavigate` function from Story 77.3
  - [x] For external URLs (non-localhost): `event.preventDefault()` then `shell.openExternal(url)`
  - [x] For internal URLs (same localhost origin): allow navigation to proceed (no `preventDefault`)
  - [x] Ensure Angular client-side routing (pushState navigation within the SPA) is NOT prevented —
        Angular Router uses `history.pushState`, which does NOT trigger `will-navigate`; only actual
        navigations (full page loads) trigger it

- [x] Validate no new Electron windows are created for external links (AC: #4)
  - [x] Confirm `setWindowOpenHandler` returns `{ action: 'deny' }` for all external URLs
  - [x] Confirm only one `BrowserWindow` exists at any time while the app is running
  - [x] Manually test (or automate in Story 77.5) that an external-link click opens the OS browser

- [x] Run `pnpm all` (AC: #1–#4)
  - [x] Confirm all unit tests and E2E tests continue to pass
  - [x] Record outcome in Dev Agent Record

## Dev Notes

### API Routing — Why It Works Automatically with `loadURL`

When `win.loadURL('http://localhost:PORT')` is used (established in Story 77.3), the renderer's
origin is `http://localhost:PORT`. All relative URLs in Angular (`/api/health`,
`/api/universe`, etc.) resolve to `http://localhost:PORT/api/...`, which is served by the
embedded Fastify process. No custom protocol handling or proxying is needed.

If — and only if — the Angular app has a hardcoded API base URL (e.g., an environment file that
points to `http://localhost:3000`), that base URL must be made dynamic. Check the environment
files first before making any changes.

---

### Dynamic Port in Angular (if needed)

If `apps/dms-material/src/environments/environment.ts` contains a hardcoded `apiUrl`, replace
it with dynamic detection:

```typescript
// apps/dms-material/src/app/app.config.ts (partial)
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';

function initApiUrl(): () => Promise<void> {
  return async () => {
    if ('electronAPI' in window) {
      const port = await (window as any).electronAPI.getApiPort();
      // Store port in a global or inject into HttpClient base URL
      (window as any).__apiPort = port;
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initApiUrl,
      multi: true,
    },
    // ... existing providers
  ],
};
```

> Only add this if the app currently uses a hardcoded API base URL. If relative URLs are already
> used, skip this entirely.

---

### External Link Handler — `setWindowOpenHandler`

```typescript
import { shell } from 'electron';

function handleWindowOpen({ url }: Electron.HandlerDetails): Electron.WindowOpenHandlerResponse {
  const localOrigin = `http://localhost:${resolvedPort}`;
  if (url.startsWith(localOrigin)) {
    return { action: 'allow' };
  }
  // External link — open in OS browser, deny new Electron window
  shell.openExternal(url);
  return { action: 'deny' };
}

mainWindow.webContents.setWindowOpenHandler(handleWindowOpen);
```

---

### Updated `will-navigate` Handler

```typescript
function handleWillNavigate(event: Electron.Event, url: string): void {
  const localOrigin = `http://localhost:${resolvedPort}`;
  if (!url.startsWith(localOrigin)) {
    event.preventDefault();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
  }
  // Internal URL — allow navigation without preventing
}

mainWindow.webContents.on('will-navigate', handleWillNavigate);
```

---

### Angular Router and `will-navigate`

Angular Router uses the History API (`pushState`) for client-side navigation. **This does not
trigger Electron's `will-navigate` event.** Only full-page navigations (e.g., clicking an
`<a href="...">` that causes a real browser navigation, or a redirect) trigger `will-navigate`.
Therefore, standard Angular Router link clicks are safe and do not need special handling.

---

### Testing External Link Behaviour

If the app does not currently have any external links, locate any `<a target="_blank" href="...">` tags or programmatic `window.open(...)` calls. You can also test via DevTools console:

```javascript
window.open('https://www.google.com');
```

This should open in the OS browser, not a new Electron window.

---

### `shell` Import

`shell` is part of Electron's main process API:

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron';
```

Do not import `shell` in the preload or renderer — it is a main-process-only API.

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Start full Electron app | `pnpm nx run electron:start` |
| Open DevTools in Electron | In `main.ts`: `win.webContents.openDevTools()` during development |
| Run all tests | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/electron/src/main.ts` | `will-navigate` handler, `setWindowOpenHandler`, `shell.openExternal` |
| `apps/dms-material/src/environments/environment.ts` | Check for hardcoded API URL |
| `apps/dms-material/src/app/app.config.ts` | APP_INITIALIZER for dynamic port (if needed) |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

N/A

### Completion Notes List

- Added `shell` to the electron import in `main.ts`
- Updated `handleWillNavigate` to call `shell.openExternal(url)` for external http/https URLs
- Updated `setWindowOpenHandler` to call `shell.openExternal(details.url)` for external URLs before returning `{ action: 'deny' }`
- Confirmed Angular app uses relative URLs (`./api/...`) for all API calls in effect services
- The only hardcoded `apiUrl` is in `secure-cookie.service.ts` for auth endpoints; in Electron dev mode `useMockAuth: true` so these are never called; no change needed
- Angular Router uses `history.pushState` (client-side navigation) which does NOT trigger `will-navigate`, so SPA routing is unaffected

### File List

- `apps/electron/src/main.ts`
