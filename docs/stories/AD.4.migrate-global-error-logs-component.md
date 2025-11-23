# Story AD.4: Migrate Global Error Logs Component

## Story

**As an** administrator viewing system errors
**I want** a paginated, filterable error log table
**So that** I can diagnose and resolve issues

## Context

**Current System:**

- Location: `apps/rms/src/app/global/global-error-logs/`
- PrimeNG components: `p-table`, `p-toolbar`, `p-paginator`, `p-button`, `p-select`
- Displays error logs with pagination and filtering

**Migration Target:**

- Material table with paginator
- Material select for filtering

## Acceptance Criteria

### Functional Requirements

- [ ] Error logs display in table
- [ ] Pagination controls work
- [ ] Filter by error type, date range
- [ ] Expandable row for error details
- [ ] Clear/acknowledge errors

### Technical Requirements

- [ ] Uses `mat-table` with `mat-paginator`
- [ ] Server-side pagination
- [ ] Loading states during fetch

## Technical Approach

Create `apps/rms-material/src/app/global/global-error-logs/global-error-logs.component.ts`:

```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { DatePipe } from '@angular/common';

interface ErrorLog {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  details: string;
  resolved: boolean;
}

@Component({
  selector: 'rms-global-error-logs',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatExpansionModule,
    DatePipe,
  ],
  templateUrl: './global-error-logs.component.html',
  styleUrl: './global-error-logs.component.scss',
})
export class GlobalErrorLogsComponent implements OnInit {
  displayedColumns = ['timestamp', 'type', 'message', 'actions'];

  errorLogs = signal<ErrorLog[]>([]);
  totalRecords = signal(0);
  pageSize = signal(25);
  pageIndex = signal(0);
  isLoading = signal(false);

  errorTypes = ['All', 'API Error', 'Auth Error', 'Data Error', 'System Error'];
  selectedType = signal<string>('All');

  ngOnInit(): void {
    this.loadErrorLogs();
  }

  loadErrorLogs(): void {
    this.isLoading.set(true);
    // Fetch from API with pagination
    // this.errorLogService.getErrorLogs(...)
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadErrorLogs();
  }

  onTypeFilter(type: string): void {
    this.selectedType.set(type);
    this.pageIndex.set(0);
    this.loadErrorLogs();
  }

  onClearError(error: ErrorLog): void {
    // Mark error as resolved
  }
}
```

## Template

```html
<div class="error-logs-container">
  <mat-toolbar class="error-toolbar">
    <span>Error Logs</span>
    <span class="spacer"></span>
    <mat-form-field appearance="outline">
      <mat-label>Type</mat-label>
      <mat-select [value]="selectedType()" (selectionChange)="onTypeFilter($event.value)">
        @for (type of errorTypes; track type) {
          <mat-option [value]="type">{{ type }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  </mat-toolbar>

  <table mat-table [dataSource]="errorLogs()">
    <ng-container matColumnDef="timestamp">
      <th mat-header-cell *matHeaderCellDef>Timestamp</th>
      <td mat-cell *matCellDef="let row">{{ row.timestamp | date:'medium' }}</td>
    </ng-container>

    <ng-container matColumnDef="type">
      <th mat-header-cell *matHeaderCellDef>Type</th>
      <td mat-cell *matCellDef="let row">{{ row.type }}</td>
    </ng-container>

    <ng-container matColumnDef="message">
      <th mat-header-cell *matHeaderCellDef>Message</th>
      <td mat-cell *matCellDef="let row">{{ row.message }}</td>
    </ng-container>

    <ng-container matColumnDef="actions">
      <th mat-header-cell *matHeaderCellDef>Actions</th>
      <td mat-cell *matCellDef="let row">
        <button mat-icon-button (click)="onClearError(row)">
          <mat-icon>check</mat-icon>
        </button>
      </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
  </table>

  <mat-paginator
    [length]="totalRecords()"
    [pageSize]="pageSize()"
    [pageIndex]="pageIndex()"
    [pageSizeOptions]="[10, 25, 50, 100]"
    (page)="onPageChange($event)"
  ></mat-paginator>
</div>
```

## Definition of Done

- [ ] Error logs table displays
- [ ] Pagination works correctly
- [ ] Type filter works
- [ ] Clear error action works
- [ ] Loading states show
- [ ] All validation commands pass
