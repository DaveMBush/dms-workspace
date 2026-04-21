# Story 80.2: Restore Error Log File-Viewer Component and Fix Route

Status: Done

## Story

As Dave,
I want the Error Logs screen to show individual error log files and give me a button to delete each file when I'm done with it,
so that I can review and manage error logs the same way I could before the refactor.

## Acceptance Criteria

1. **Given** component source recovered in Story 80.1,
   **When** developer restores file-viewer component to original location (or equivalent),
   **Then** component compiles without errors and adheres to Angular conventions (`inject()`, `OnPush`, signals).

2. **Given** restored component,
   **When** developer updates Angular router to point Error Logs route at restored file-viewer,
   **Then** navigating to Error Logs menu item displays file-viewer, not summary stub.

3. **Given** file-viewer is displayed,
   **When** error log files exist in logs directory,
   **Then** each file is listed with its name and a "Delete" button.

4. **Given** Dave clicks "Delete" on an error log file,
   **When** deletion is confirmed and processed,
   **Then** file is removed from disk and disappears from list without page reload.

5. **Given** restoration complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Review Story 80.1 findings (AC: #1)

  - [x] Read `80-1-locate-error-log-component-git.md` Dev Notes — "Investigation Findings" section
  - [x] Confirm recovered component source, component class name, and correct route target are available
  - [x] If component not recoverable from git, reconstruct from scratch (see Dev Notes for expected shape)

- [x] Task 2: Restore or reconstruct the file-viewer component (AC: #1, #3)

  - [x] Create component file(s) at original path (or equivalent) in `apps/dms-material/src/app/`
  - [x] Adapt component to use `inject()` instead of constructor injection
  - [x] Apply `ChangeDetectionStrategy.OnPush`
  - [x] Use signals (`signal()`, `computed()`) for the file list state
  - [x] Component must list files from backend API (`GET /api/error-logs`)
  - [x] Each file row must show: filename + "Delete" button
  - [x] Delete button calls `DELETE /api/error-logs/:filename` and removes row from signal-based list
  - [x] Named functions for all callbacks — no anonymous arrow functions

- [x] Task 3: Check and create backend endpoints if missing (AC: #3, #4)

  - [x] Check `apps/server/src/app/routes/` for existing `GET /api/error-logs` and `DELETE /api/error-logs/:filename`
  - [x] If missing, create the route file with Fastify handlers:
    - `GET /api/logs/files` — reads `logs/` directory, returns array of `LogFileInfo` objects (uses existing autoloaded route)
    - `DELETE /api/logs/files/:filename` — validates filename (no path traversal), deletes file from `logs/`
  - [x] Logs directory: `logs/` at project root (confirm location by checking where the server writes logs)
  - [x] Security: validate filename param — reject any value containing `/`, `..`, or path separators

- [x] Task 4: Update Angular router (AC: #2)

  - [x] Open `apps/dms-material/src/app/app.routes.ts`
  - [x] Find the Error Logs route entry (identified in Story 80.1)
  - [x] Update `component:` reference to point at the restored file-viewer component class
  - [x] Verify lazy-loading import path is correct if route uses `loadComponent`

- [x] Task 5: Run full test suite (AC: #5)
  - [x] Run `pnpm all` and confirm all tests pass
  - [x] Run `pnpm e2e:dms-material:chromium` to confirm E2E passes (Story 80.3 will add more tests)
  - [x] Do not modify pre-existing tests

## Dev Notes

### Prerequisite

**Story 80.1 must be completed** with the "Investigation Findings" section filled in before starting this story.

### Component Pattern

The restored component must follow current Angular conventions. Example structure:

```typescript
// error-log.component.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-error-log',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatListModule],
  templateUrl: './error-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorLogComponent {
  private http = inject(HttpClient);
  errorLogFiles = signal<string[]>([]);

  constructor() {
    this.loadFiles();
  }

  loadFiles(): void {
    this.http.get<string[]>('/api/error-logs').subscribe(
      function handleFiles(files) {
        // named function — no anonymous arrow function
        this.errorLogFiles.set(files);
      }.bind(this)
    ); // or use rxjs take(1) pattern
  }

  deleteFile(filename: string): void {
    this.http.delete(`/api/error-logs/${encodeURIComponent(filename)}`).subscribe(
      function handleDelete() {
        this.errorLogFiles.update(function removeFile(files) {
          return files.filter(function isNotDeleted(f) {
            return f !== filename;
          });
        });
      }.bind(this)
    );
  }
}
```

> Note: Adapt the actual code to match the project's HTTP service pattern (there may be a custom API service — check `apps/dms-material/src/app/services/` or `apps/dms-material/src/app/api/`).

### Backend Endpoint Pattern (Fastify)

```typescript
// error-logs.route.ts
import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const LOGS_DIR = path.resolve(process.cwd(), 'logs');

export async function registerErrorLogsRoutes(app: FastifyInstance) {
  app.get('/api/error-logs', async function listErrorLogs(_request, reply) {
    const files = fs.readdirSync(LOGS_DIR).filter(function isLogFile(f) {
      return f.endsWith('.log') || f.endsWith('.txt');
    });
    return reply.send(files);
  });

  app.delete('/api/error-logs/:filename', async function deleteErrorLog(request, reply) {
    const { filename } = request.params as { filename: string };
    // Security: reject path traversal attempts
    if (filename.includes('/') || filename.includes('..') || filename.includes('\\')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(LOGS_DIR, filename);
    fs.unlinkSync(filePath);
    return reply.send({ deleted: filename });
  });
}
```

### Logs Directory

The project writes server logs to `logs/` at the workspace root (visible in workspace structure). Confirm the exact path used by the server in its logger configuration.

### Security Note

The `DELETE /api/error-logs/:filename` endpoint **must** validate the filename parameter to prevent path traversal attacks (OWASP A01). Reject any filename containing `/`, `\`, or `..` before constructing the file path.

### Key Commands

| Purpose                | Command                                            |
| ---------------------- | -------------------------------------------------- |
| Run all tests          | `pnpm all`                                         |
| Run Chromium E2E       | `pnpm e2e:dms-material:chromium`                   |
| List server routes     | `ls apps/server/src/app/routes/`                   |
| Find Angular router    | `cat apps/dms-material/src/app/app.routes.ts`      |
| Find existing services | `ls apps/dms-material/src/app/services/` (or api/) |
| Check logs directory   | `ls logs/`                                         |

### Key Files

| File                                      | Purpose                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `80-1-locate-error-log-component-git.md`  | Investigation findings — component source and route target        |
| `apps/dms-material/src/app/app.routes.ts` | Angular router — update Error Logs route                          |
| `apps/dms-material/src/app/`              | Restore component here (confirm path from 80.1)                   |
| `apps/server/src/app/routes/`             | Add `GET`/`DELETE` error-logs endpoints if missing                |
| `logs/`                                   | Project logs directory — files listed and deleted by this feature |

### Constraints

- `inject()` — no constructor injection
- `ChangeDetectionStrategy.OnPush` on all components
- Signal-first state management for file list
- Named functions for all callbacks — no anonymous arrow functions
- No NgModules — standalone components only
- Security: validate filename in DELETE endpoint before file system access

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- Read full 80-1 findings — confirmed `GlobalErrorLogs` original class name and `48fec6ab~1` recovery path
- Previous session had committed implementation with class named `GlobalErrorLogs` (no Component suffix)
- Ran `pnpm all` with `NX_WORKSPACE_ROOT_PATH` override — caught `@angular-eslint/component-class-suffix` error
- Renamed `GlobalErrorLogs` → `GlobalErrorLogsComponent` and updated route; re-ran lint to confirm clean
- `pnpm all` passed; dupcheck showed 0 clones; format applied to html+ts
- E2E chromium + firefox both passed (1 test each in `error-logs.spec.ts`)

### Completion Notes List

- All 5 ACs satisfied
- Component uses `inject()`, `OnPush`, signals, named functions — adheres to Angular conventions
- Backend endpoints use existing `/api/logs/files` autoloaded route (fits project structure better than new `/api/error-logs`)
- `isValidFilename()` security guard added to DELETE handler — strict alphanumeric regex + `..` check
- Class renamed to `GlobalErrorLogsComponent` to comply with `@angular-eslint/component-class-suffix` ESLint rule

### File List

- `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts` (replaced stub with file-viewer)
- `apps/dms-material/src/app/global/global-error-logs/global-error-logs.html` (replaced table with mat-list + delete buttons)
- `apps/dms-material/src/app/app.routes.ts` (updated route to `GlobalErrorLogsComponent`)
- `apps/server/src/app/routes/logs/index.ts` (added `isValidFilename` guard + `/files` and `/files/:filename` handlers)

### Change Log

- 2026-04-21: Implementation complete. All tasks done, all tests pass, story Status → Done.

## Status: Done
