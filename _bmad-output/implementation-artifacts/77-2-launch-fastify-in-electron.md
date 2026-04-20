# Story 77.2: Launch Fastify Backend from Electron Main Process

Status: Approved

## Story

As a developer,
I want the Electron main process to start the Fastify server on a dynamically chosen local port before the BrowserWindow opens,
so that API calls from the renderer can be served by the same backend that currently runs in development.

## Acceptance Criteria

1. **Given** `pnpm nx run electron:start`,
   **When** the main process initialises,
   **Then** Fastify starts, logs its port to stdout, and `GET /api/health` returns `200` before the BrowserWindow is shown.

2. **Given** Fastify running inside Electron,
   **When** a developer inspects network requests to `/api/**` from the renderer,
   **Then** responses come from the local Fastify process (not an external server).

3. **Given** Fastify fails to start (e.g., port conflict or module error),
   **When** the main process encounters the error,
   **Then** Electron logs the error to stderr and exits gracefully with a non-zero exit code.

4. **Given** the Electron app is quit,
   **When** `app.on('before-quit')` fires,
   **Then** Fastify shuts down cleanly (no hanging process).

## Tasks / Subtasks

- [ ] Decide integration strategy: in-process vs child process (AC: #1)
  - [ ] Evaluate importing `apps/server` directly vs forking it as a child process
  - [ ] Prefer `child_process.fork()` for isolation; document choice in Dev Agent Record
  - [ ] Confirm the built server entry point path: `dist/apps/server/main.js`

- [ ] Implement dynamic port selection (AC: #1)
  - [ ] Add `findAvailablePort()` helper in `apps/electron/src/utils/port.ts` using Node `net` module
  - [ ] Helper resolves a port by binding to `0` and reading the assigned port, then closing the socket
  - [ ] Write a unit test for `findAvailablePort()` in `apps/electron/src/utils/port.spec.ts`

- [ ] Start Fastify before BrowserWindow (AC: #1, #2)
  - [ ] In `main.ts`, call `findAvailablePort()` before `app.whenReady()`
  - [ ] Fork/spawn the server process, passing the port via environment variable or IPC
  - [ ] Wait for the server to signal ready (health-check ping or IPC `ready` message) before calling `createWindow()`
  - [ ] Log `[electron] Fastify started on port ${port}` to stdout

- [ ] Health-check verification (AC: #1)
  - [ ] After server signals ready, perform a `GET http://localhost:${port}/api/health` request in main process
  - [ ] Only call `createWindow()` if health check returns 200
  - [ ] Log result to stdout

- [ ] Pass port to renderer (AC: #2)
  - [ ] Store resolved port in a module-scoped variable in `main.ts`
  - [ ] Expose port via IPC handle in `preload.ts`: `electronAPI.getApiPort()`
  - [ ] Renderer can then use `http://localhost:${port}/api/...` for all API calls

- [ ] Error handling — server fails to start (AC: #3)
  - [ ] Wrap server start in try/catch (or handle child process `error` / `exit` events)
  - [ ] On failure: log error with `console.error`, call `app.exit(1)`
  - [ ] Confirm Electron exits with code 1 on forced failure (test manually)

- [ ] Graceful shutdown (AC: #4)
  - [ ] Register `app.on('before-quit', handleQuit)` in `main.ts` (named function, not arrow)
  - [ ] In `handleQuit`: send shutdown signal to forked server process and wait for it to exit
  - [ ] If child process doesn't exit within 3 s, call `childProcess.kill('SIGTERM')`

- [ ] Update Nx `start` target dependencies (AC: #1)
  - [ ] Ensure `electron:start` depends on `server:build` so the server dist is up-to-date
  - [ ] Update `project.json` `start` target `dependsOn` array
  - [ ] Run `pnpm nx run electron:start` end-to-end and confirm health check passes before window opens

- [ ] Run `pnpm all` (AC: #1–#4)
  - [ ] Confirm all unit tests pass including new `port.spec.ts`
  - [ ] Confirm no existing targets are broken
  - [ ] Record outcome in Dev Agent Record

## Dev Notes

### Integration Strategy

**Recommended approach: `child_process.fork()`**

Forking the server as a child process keeps the main process lightweight and crash-isolated. If
the server process crashes, the main process can detect it via the `exit` event and handle it
gracefully without taking down the whole Electron app.

Alternative (in-process `require`): simpler but risks the server's Node.js globals conflicting
with Electron's main process. Only use this if `fork()` proves problematic.

---

### Dynamic Port Helper

```typescript
// apps/electron/src/utils/port.ts
import * as net from 'net';

export function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not determine port'));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
```

---

### Launching the Server via `fork()`

```typescript
// apps/electron/src/main.ts (partial)
import { fork, ChildProcess } from 'child_process';
import path from 'path';

let serverProcess: ChildProcess | null = null;

async function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../../dist/apps/server/main.js');
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, PORT: String(port) },
      silent: false,
    });

    serverProcess.on('message', (msg) => {
      if (msg === 'ready') resolve();
    });

    serverProcess.on('error', reject);

    serverProcess.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Server exited with code ${code}`));
    });

    // Timeout fallback
    setTimeout(() => reject(new Error('Server start timeout')), 10_000);
  });
}
```

> **Note:** The existing `apps/server/src/main.ts` may need a small change to send
> `process.send('ready')` after the Fastify instance is listening. Check whether it already
> does so; if not, add it as part of this story.

---

### IPC Surface in `preload.ts`

```typescript
// apps/electron/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiPort: (): Promise<number> => ipcRenderer.invoke('get-api-port'),
});
```

Register the handler in `main.ts`:

```typescript
import { ipcMain } from 'electron';

let resolvedPort: number;

ipcMain.handle('get-api-port', () => resolvedPort);
```

---

### Health Check Before Window

```typescript
import http from 'http';

function healthCheck(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/api/health`, (res) => {
      if (res.statusCode === 200) resolve();
      else reject(new Error(`Health check failed: ${res.statusCode}`));
    }).on('error', reject);
  });
}
```

---

### Graceful Shutdown

```typescript
function handleQuit(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

app.on('before-quit', handleQuit);
```

---

### Server Entry Point

The existing server entry is `apps/server/src/main.ts`. After build, the compiled output will
be at `dist/apps/server/main.js`. Check `apps/server/project.json` for the exact `outputPath`
configured in the build target.

If the server does not currently send `process.send('ready')`, add this after the Fastify
`.listen()` callback inside `apps/server/src/main.ts`:

```typescript
fastify.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`Server listening on port ${port}`);
  if (process.send) process.send('ready'); // ← add this line
});
```

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Build server | `pnpm nx run server:build` |
| Build electron | `pnpm nx run electron:build` |
| Start Electron (includes server) | `pnpm nx run electron:start` |
| Run all tests | `pnpm all` |
| Run unit tests only | `pnpm test` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/electron/src/main.ts` | Electron main process — server start, IPC, BrowserWindow |
| `apps/electron/src/preload.ts` | contextBridge IPC surface exposed to renderer |
| `apps/electron/src/utils/port.ts` | Dynamic port helper |
| `apps/electron/src/utils/port.spec.ts` | Unit tests for port helper |
| `apps/electron/project.json` | Nx targets — add `server:build` to `dependsOn` |
| `apps/server/src/main.ts` | Fastify entry point — add `process.send('ready')` if needed |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
