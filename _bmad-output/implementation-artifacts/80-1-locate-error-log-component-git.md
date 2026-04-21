# Story 80.1: Locate Original Error Log Component in Git History

Status: Done

## Story

As a developer,
I want to find the last commit that contained the full error-log file-viewer component by examining the git history for Epic 1 and Epic 70,
so that Story 80.2 has the exact code to restore.

## Acceptance Criteria

1. **Given** git log for the repository,
   **When** developer runs `git log --all --oneline` and filters for Epic 1 and Epic 70 commits,
   **Then** commit SHAs are identified and recorded in Dev Notes.

2. **Given** Epic 1 commits,
   **When** developer runs `git show <sha> -- <path>` for paths affected by Epic 1,
   **Then** full source of deleted error-log file-viewer component is retrieved.

3. **Given** Epic 70 commits,
   **When** developer inspects routing change,
   **Then** incorrect component reference (stub) and correct component path (file-viewer) are both documented in Dev Notes.

4. **Given** no production code changed,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Find Epic 1 and Epic 70 commits in git history (AC: #1)

  - [x] Run `git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log\|ErrorLog"` to find relevant commits
  - [x] Run `git log --all --oneline -- apps/dms-material/src/ | head -50` to scan recent frontend commits
  - [x] Record all relevant commit SHAs in Dev Notes

- [x] Task 2: Recover deleted error-log file-viewer component source (AC: #2)

  - [x] For each Epic 1 commit SHA: run `git show <sha> -- apps/dms-material/src/` to see what was deleted
  - [x] Search specifically: `git log --all --oneline -- apps/dms-material/src/app/` for paths containing `error-log`, `error-logs`
  - [x] Use `git show <sha>:<file-path>` to retrieve full file content of the deleted component
  - [x] Record full component source code in Dev Notes (all `.ts`, `.html`, `.scss` files)

- [x] Task 3: Document the incorrect routing from Epic 70 (AC: #3)

  - [x] Find Epic 70 commits and inspect `app.routes.ts` or routing file changes
  - [x] Run `git diff <epic70-sha>~1 <epic70-sha> -- apps/dms-material/src/` to see the routing change
  - [x] Identify: what component was the Error Logs route pointing at before (stub name) vs what it should point at (file-viewer)
  - [x] Record both component class names/paths in Dev Notes

- [x] Task 4: Confirm no production code changes and tests pass (AC: #4)
  - [x] Run `pnpm all` — this is investigation only, no files should have been modified

## Dev Notes

### Epic Context

- **Epic 1** = "Remove Unused Code" — **completed/done**. During this epic, the error-log file-viewer component was likely deleted as "unused code" — but it is actually needed for the Error Logs screen.
- **Epic 70** = "Restore Error Logs Route" — stories are `ready-for-dev`. During this epic, a routing change pointed the Error Logs route at a summary stub instead of the file-viewer component.

### Git Investigation Strategy

Run these commands in order and record results:

```bash
# 1. Find commits mentioning Epic 1 / Epic 70 / error-log
git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log\|ErrorLog"

# 2. Find commits touching frontend app dir
git log --all --oneline -- apps/dms-material/src/ | head -50

# 3. Find commits that touched error-log related files
git log --all --oneline -- "apps/dms-material/src/app/**/*error*"
git log --all --oneline -- "apps/dms-material/src/app/**/*Error*"

# 4. Once you have a SHA, see what was in that commit for frontend
git show <sha> --stat -- apps/dms-material/src/

# 5. Recover a deleted file from a specific commit
git show <sha>:apps/dms-material/src/app/path/to/component.ts

# 6. See the full diff for the routing change
git diff <sha>~1 <sha> -- apps/dms-material/src/app/app.routes.ts
```

### Expected Component Structure

The error-log file-viewer component was likely structured as:

```
apps/dms-material/src/app/
  error-log/
    error-log.component.ts    (or error-logs.component.ts)
    error-log.component.html
    error-log.component.scss  (optional)
```

Look for variations: `error-log`, `error-logs`, `error-log-viewer`, `error-log-file-viewer`.

### Current Route Situation (Epic 70 context)

Check `apps/dms-material/src/app/app.routes.ts` for the current error-logs route entry. It likely points to a stub component. The correct target should be the file-viewer component recovered from git history.

### Investigation Findings

#### Relevant Commit SHAs

| Purpose                                   | SHA        | Commit Message                                                                            |
| ----------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Epic 1 — audit (Story 1.1)                | `96341a30` | `feat(audit): Story 1.1 - Audit components for unused declarations (#680)`                |
| Epic 1 — deleted file-viewer (standalone) | `48fec6ab` | `refactor: remove unused GlobalErrorLogs component`                                       |
| Epic 1 — batch removal PR (Story 1.2)     | `40804007` | `refactor: Story 1.2 - Remove unused components (batch) (#682)`                           |
| Epic 70 — routing restore (Story 70.1 PR) | `5d823198` | `fix(routing): restore error-logs route and create component (Story 70.1) (#1045)`        |
| Epic 70 — pre-merge commit                | `7bf90c12` | `fix(routing): restore error-logs route and create component (Story 70.1) - Closes #1044` |

**Key deletion commit**: `48fec6ab` — this is the commit whose PARENT (`48fec6ab~1`) contains the full original component. Recover files using `git show 48fec6ab~1:<path>`.

#### Recovered Component Files

Recovered from `git show 48fec6ab~1:apps/dms-material/src/app/global/global-error-logs/<file>` — i.e., the state just BEFORE Epic 1 deleted them.

**`apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts`** (full source, 131 lines, class name `GlobalErrorLogs` — no "Component" suffix):

```typescript
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  requestId: string;
  userId: string;
  context: string;
}

@Component({
  selector: 'dms-global-error-logs',
  imports: [DatePipe, FormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatPaginatorModule, MatSelectModule, MatTableModule, MatToolbarModule],
  templateUrl: './global-error-logs.html',
  styleUrl: './global-error-logs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalErrorLogs implements OnInit {
  displayedColumns = ['timestamp', 'level', 'message', 'requestId', 'userId', 'context'];

  pageSizeOptions = [10, 25, 50, 100];

  errorLogs$ = signal<ErrorLog[]>([]);
  totalRecords$ = signal(0);
  pageSize$ = signal(50);
  pageIndex$ = signal(0);
  isLoading$ = signal(false);

  // Filter options
  fileTypes = ['All Files', 'API', 'Database', 'Auth', 'System'];
  levels = ['All Levels', 'INFO', 'WARNING', 'ERROR', 'DEBUG'];

  // Filter values
  selectedFile$ = signal<string>('All Files');
  selectedLevel$ = signal<string>('All Levels');
  startDate$ = signal<Date | null>(null);
  endDate$ = signal<Date | null>(null);
  searchMessage = '';

  ngOnInit(): void {
    this.loadErrorLogs();
  }

  loadErrorLogs(): void {
    this.isLoading$.set(true);
    // Fetch from API with pagination and filters
    // Simulate API call for now
    setTimeout(this.clearLoadingState.bind(this), 100);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex$.set(event.pageIndex);
    this.pageSize$.set(event.pageSize);
    this.loadErrorLogs();
  }

  onFileFilter(file: string): void {
    this.selectedFile$.set(file);
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onLevelFilter(level: string): void {
    this.selectedLevel$.set(level);
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onStartDateChange(date: Date | null): void {
    this.startDate$.set(date);
  }

  onEndDateChange(date: Date | null): void {
    this.endDate$.set(date);
  }

  onApplyFilters(): void {
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onSearch(): void {
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  private clearLoadingState(): void {
    this.isLoading$.set(false);
  }
}
```

**`apps/dms-material/src/app/global/global-error-logs/global-error-logs.html`** (full source, 155 lines):

```html
<mat-card>
  <mat-card-header>
    <mat-card-title>
      <h1>Error Logs</h1>
    </mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="error-logs-container">
      <!-- Filter Toolbar -->
      <mat-toolbar class="filter-toolbar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>File type</mat-label>
          <mat-select [value]="selectedFile$()" (selectionChange)="onFileFilter($event.value)">
            @for (file of fileTypes; track file) {
            <mat-option [value]="file">{{ file }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Log level</mat-label>
          <mat-select [value]="selectedLevel$()" (selectionChange)="onLevelFilter($event.value)">
            @for (level of levels; track level) {
            <mat-option [value]="level">{{ level }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field date-field">
          <input matInput [matDatepicker]="startPicker" placeholder="mm/dd/yyyy" [value]="startDate$()" (dateChange)="onStartDateChange($event.value)" />
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field date-field">
          <mat-label>End date</mat-label>
          <input matInput [matDatepicker]="endPicker" placeholder="mm/dd/yyyy" [value]="endDate$()" (dateChange)="onEndDateChange($event.value)" />
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field search-field">
          <mat-label>Search messages</mat-label>
          <input matInput placeholder="Search messages..." [(ngModel)]="searchMessage" />
        </mat-form-field>

        <button mat-icon-button (click)="onApplyFilters()" class="filter-button" aria-label="Apply filters">
          <mat-icon>filter_list</mat-icon>
        </button>

        <button mat-icon-button color="primary" (click)="onSearch()" class="search-button" aria-label="Search">
          <mat-icon>search</mat-icon>
        </button>
      </mat-toolbar>

      <!-- Error Logs Table -->
      <table mat-table [dataSource]="errorLogs$()" aria-label="Error logs">
        <ng-container matColumnDef="timestamp">
          <th mat-header-cell *matHeaderCellDef>Timestamp</th>
          <td mat-cell *matCellDef="let row">{{ row.timestamp | date:'M/d/yyyy, h:mm:ss a' }}</td>
        </ng-container>

        <ng-container matColumnDef="level">
          <th mat-header-cell *matHeaderCellDef>Level</th>
          <td mat-cell *matCellDef="let row">
            <span class="level-badge" [class.level-warning]="row.level === 'WARNING'" [class.level-error]="row.level === 'ERROR'" [class.level-info]="row.level === 'INFO'" [class.level-debug]="row.level === 'DEBUG'">{{ row.level }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="message">
          <th mat-header-cell *matHeaderCellDef>Message</th>
          <td mat-cell *matCellDef="let row" class="message-cell">{{ row.message }}</td>
        </ng-container>

        <ng-container matColumnDef="requestId">
          <th mat-header-cell *matHeaderCellDef>Request ID</th>
          <td mat-cell *matCellDef="let row">{{ row.requestId }}</td>
        </ng-container>

        <ng-container matColumnDef="userId">
          <th mat-header-cell *matHeaderCellDef>User ID</th>
          <td mat-cell *matCellDef="let row">{{ row.userId }}</td>
        </ng-container>

        <ng-container matColumnDef="context">
          <th mat-header-cell *matHeaderCellDef>Context</th>
          <td mat-cell *matCellDef="let row">{{ row.context }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      <!-- Pagination -->
      <mat-paginator [length]="totalRecords$()" [pageSize]="pageSize$()" [pageIndex]="pageIndex$()" [pageSizeOptions]="pageSizeOptions" (page)="onPageChange($event)" showFirstLastButtons></mat-paginator>
    </div>
  </mat-card-content>
</mat-card>
```

**`apps/dms-material/src/app/global/global-error-logs/global-error-logs.scss`** (full source, ~70 lines):

```scss
.error-logs-container {
  width: 100%;
}

.filter-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  margin-bottom: 16px;
  background-color: transparent;
  flex-wrap: wrap;
}

.filter-field {
  min-width: 150px;

  &.date-field {
    min-width: 180px;
  }

  &.search-field {
    flex: 1;
    min-width: 250px;
  }
}

.filter-button,
.search-button {
  margin-left: 8px;
}

table {
  width: 100%;
}

.message-cell {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;

  &.level-warning {
    background-color: #fff3cd;
    color: #856404;
  }

  &.level-error {
    background-color: #f8d7da;
    color: #721c24;
  }

  &.level-info {
    background-color: #d1ecf1;
    color: #0c5460;
  }

  &.level-debug {
    background-color: #d6d8db;
    color: #383d41;
  }
}
```

#### Routing Change (Epic 70)

**Before Epic 1 deletion** (commit `48fec6ab~1`), the route in `app.routes.ts` was:

```typescript
{
  path: 'global/error-logs',
  loadComponent: async () =>
    import('./global/global-error-logs/global-error-logs').then(
      (m) => m.GlobalErrorLogs   // ← class WITHOUT "Component" suffix
    ),
},
```

**After Epic 1 deletion** (commits `48fec6ab` / `40804007`): route entry removed entirely.

**After Epic 70 restore** (commit `5d823198`), the route was re-added pointing to a NEW stub:

```typescript
{
  path: 'global/error-logs',
  loadComponent: async () =>
    import('./global/global-error-logs/global-error-logs').then(
      (m) => m.GlobalErrorLogsComponent   // ← NEW stub class WITH "Component" suffix
    ),
},
```

**Summary for Story 80.2**:

- Current stub (wrong): `GlobalErrorLogsComponent` — 64-line stub created by Epic 70, only shows 3 columns (timestamp, level, message), no filters, no pagination, fetches from `/api/logs/errors`
- Original component (correct): `GlobalErrorLogs` — 131-line full component with filter toolbar, 6-column table, pagination, and client-side state management
- File path is the same: `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts`
- The route import path is unchanged; only the exported class name and implementation differ
- Story 80.2 should replace the stub files with the recovered originals and update the route to export `GlobalErrorLogs` (not `GlobalErrorLogsComponent`)

### Key Commands

| Purpose                                 | Command                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Grep commit messages for epic/error-log | `git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log"` |
| Commits touching frontend               | `git log --all --oneline -- apps/dms-material/src/ \| head -50`          |
| Show commit diff                        | `git show <sha> --stat -- apps/dms-material/src/`                        |
| Recover deleted file                    | `git show <sha>:<file-path>`                                             |
| Routing file diff                       | `git diff <sha>~1 <sha> -- apps/dms-material/src/app/app.routes.ts`      |
| Run all tests                           | `pnpm all`                                                               |

### Key Files

| File                                                       | Purpose                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/dms-material/src/app/app.routes.ts`                  | Angular router config — current Error Logs route definition      |
| `apps/dms-material/src/app/`                               | Search here for error-log related component directories          |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint status — confirm Epic 1 is done, Epic 70 is ready-for-dev |

### Constraints

- **Investigation only** — no production code changes
- All findings must be recorded in Dev Notes so Story 80.2 can proceed without re-investigation
- If the component source cannot be recovered from git, note that explicitly so Story 80.2 can reconstruct from scratch

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- Ran `git log --all --oneline --grep="Epic 1\|Epic 70\|error.log\|error-log\|ErrorLog"` — found 20 relevant commits
- Identified key deletion commit: `48fec6ab` ("refactor: remove unused GlobalErrorLogs component")
- Recovered all 3 component files from `48fec6ab~1` (parent commit before deletion)
- Confirmed Epic 70 PR merge `5d823198` created a new stub, NOT a restoration of the original
- Verified `pnpm all` passes — no production code was changed (investigation only)

### Completion Notes List

- All 4 ACs satisfied
- The component was deleted in a standalone commit `48fec6ab` on Mar 17 2026 (then also included in the Epic 1.2 batch PR `40804007`)
- Recovery command: `git show 48fec6ab~1:apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts`
- Story 80.2 can directly use the recovered source — no reconstruction needed
- Note: class name discrepancy — original uses `GlobalErrorLogs`, Epic 70 stub uses `GlobalErrorLogsComponent`; the route and import path are identical

### File List

- `_bmad-output/implementation-artifacts/80-1-locate-error-log-component-git.md`

### Change Log

- 2026-04-21: Investigation complete. Recovered full component source from commit `48fec6ab~1`. Updated all tasks to Done, Status → Done.
