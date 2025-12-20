# Story AE.6: Migrate Dividend Deposits Component (CRITICAL)

## Story

**As a** user tracking dividend income
**I want** to view dividend deposits in a performant virtual scrolling table
**So that** I can browse thousands of dividend records without performance issues

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/dividend-deposits/`
- PrimeNG components: `p-table` with `[virtualScroll]="true"`, `[lazy]="true"`
- Problem: PrimeNG's virtual scrolling with lazy data fetching does not meet requirements

**Migration Target:**

- Base table with CDK virtual scrolling
- Lazy loading via VirtualTableDataSource
- **THIS IS THE PRIMARY DRIVER FOR THE ENTIRE MIGRATION**

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** All GUI look as close to the existing RMS app as possible
- [ ] Dividend deposits display in table
- [ ] Virtual scrolling renders only visible rows
- [ ] Lazy loading fetches more data on scroll
- [ ] Add dividend action
- [ ] Edit dividend action
- [ ] Delete dividend action

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] Uses VirtualTableDataSource for lazy loading
- [ ] SmartNgRX divDeposits signal
- [ ] Debounced scroll loading
- [ ] Uses Tailwind CSS for layout.

### Performance Requirements

- [ ] Handles 1000+ dividend records
- [ ] Smooth scrolling (60fps)
- [ ] Initial render < 100ms
- [ ] Lazy load requests properly debounced

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

**CRITICAL: This is the PRIMARY DRIVER for migration - TDD is essential for comprehensive test coverage.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/dividend-deposits/dividend-deposits.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DividendDeposits } from './dividend-deposits';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('DividendDeposits', () => {
  let component: DividendDeposits;
  let fixture: ComponentFixture<DividendDeposits>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockNotification: { success: ReturnType<typeof vi.fn> };
  let mockConfirmDialog: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockDialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    mockNotification = { success: vi.fn() };
    mockConfirmDialog = { confirm: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [DividendDeposits, NoopAnimationsModule],
      providers: [{ provide: MatDialog, useValue: mockDialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(DividendDeposits);
    component = fixture.componentInstance;
  });

  describe('columns', () => {
    it('should define columns', () => {
      expect(component.columns.length).toBeGreaterThan(0);
    });

    it('should have symbol column', () => {
      expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
    });

    it('should have exDate column', () => {
      expect(component.columns.find((c) => c.field === 'exDate')).toBeTruthy();
    });

    it('should have amount column', () => {
      expect(component.columns.find((c) => c.field === 'amount')).toBeTruthy();
    });
  });

  describe('onAddDividend', () => {
    it('should open dialog in add mode', () => {
      component.onAddDividend();
      expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { mode: 'add' } }));
    });

    it('should show success notification on add', () => {
      component.onAddDividend();
      expect(mockNotification.success).toHaveBeenCalledWith('Dividend added successfully');
    });
  });

  describe('onEditDividend', () => {
    it('should open dialog in edit mode', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onEditDividend(dividend);
      expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { mode: 'edit', dividend } }));
    });
  });

  describe('onDeleteDividend', () => {
    it('should show confirm dialog', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onDeleteDividend(dividend);
      expect(mockConfirmDialog.confirm).toHaveBeenCalled();
    });

    it('should show success notification on delete confirm', () => {
      const dividend = { id: '1', symbol: 'AAPL' } as any;
      component.onDeleteDividend(dividend);
      expect(mockNotification.success).toHaveBeenCalledWith('Dividend deleted');
    });
  });

  describe('loadDividends', () => {
    it('should return observable of data', (done) => {
      const event = { first: 0, rows: 10 };
      component['loadDividends'](event).subscribe((result) => {
        expect(result.data).toBeDefined();
        expect(result.total).toBeDefined();
        done();
      });
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

### Step 1: Create Dividend Deposits Component

Create `apps/rms-material/src/app/account-panel/dividend-deposits/dividend-deposits.ts`:

```typescript
import { Component, inject, OnInit, ViewChild, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

import { BaseTableComponent, ColumnDef } from '../../shared/components/base-table/base-table.component';
import { LazyLoadEvent } from '../../shared/components/base-table/virtual-table-data-source';
import { selectDivDeposits } from '../../store/div-deposits/select-div-deposits.function';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { DivDepModal } from '../div-dep-modal/div-dep-modal.component';
import { NotificationService } from '../../shared/services/notification.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

@Component({
  selector: 'rms-dividend-deposits',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, BaseTableComponent],
  templateUrl: './dividend-deposits.html',
  styleUrl: './dividend-deposits.scss',
})
export class DividendDeposits implements OnInit {
  private divDepositsSignal = inject(selectDivDeposits);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<DivDeposit>;

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '100px' },
    { field: 'exDate', header: 'Ex-Date', type: 'date', sortable: true, width: '110px' },
    { field: 'payDate', header: 'Pay Date', type: 'date', width: '110px' },
    { field: 'amount', header: 'Amount', type: 'currency', sortable: true, width: '100px' },
    { field: 'shares', header: 'Shares', type: 'number', width: '80px' },
    { field: 'total', header: 'Total', type: 'currency', sortable: true, width: '100px' },
    { field: 'type', header: 'Type', width: '80px' },
  ];

  isLoading = signal(false);

  ngOnInit(): void {
    // Initialize data source with lazy loading function
    const context = this;
    this.table.initDataSource(function loadDividends(event: LazyLoadEvent) {
      return context.loadDividends(event);
    });
  }

  private loadDividends(event: LazyLoadEvent): Observable<{ data: DivDeposit[]; total: number }> {
    // Fetch from API with pagination
    // In real implementation, this calls the backend
    // For now, simulate with signal data
    const allData = Object.values(this.divDepositsSignal());
    const data = allData.slice(event.first, event.first + event.rows);
    return of({ data: data as DivDeposit[], total: allData.length });
  }

  onAddDividend(): void {
    const context = this;
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe(function onClose(result) {
      if (result) {
        context.notification.success('Dividend added successfully');
        context.table.refresh();
      }
    });
  }

  onEditDividend(dividend: DivDeposit): void {
    const context = this;
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
      data: { mode: 'edit', dividend },
    });

    dialogRef.afterClosed().subscribe(function onClose(result) {
      if (result) {
        context.notification.success('Dividend updated successfully');
        context.table.refresh();
      }
    });
  }

  onDeleteDividend(dividend: DivDeposit): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Delete Dividend',
        message: `Are you sure you want to delete this dividend for ${dividend.symbol}?`,
        confirmText: 'Delete',
      })
      .subscribe(function onConfirm(confirmed) {
        if (confirmed) {
          // Delete via SmartNgRX
          context.notification.success('Dividend deleted');
          context.table.refresh();
        }
      });
  }
}
```

### Step 2: Create Template

Create `apps/rms-material/src/app/account-panel/dividend-deposits/dividend-deposits.html`:

```html
<div class="dividend-deposits-container">
  <mat-toolbar class="deposits-toolbar">
    <span class="toolbar-title">Dividend Deposits</span>
    <span class="spacer"></span>
    <button mat-raised-button color="primary" (click)="onAddDividend()">
      <mat-icon>add</mat-icon>
      Add Dividend
    </button>
  </mat-toolbar>

  <rms-base-table [columns]="columns" [rowHeight]="48" [bufferSize]="20" (rowClick)="onEditDividend($event)">
    <ng-template #cellTemplate let-row let-column="column">
      @switch (column.field) { @case ('actions') {
      <button mat-icon-button (click)="onEditDividend(row); $event.stopPropagation()">
        <mat-icon>edit</mat-icon>
      </button>
      <button mat-icon-button color="warn" (click)="onDeleteDividend(row); $event.stopPropagation()">
        <mat-icon>delete</mat-icon>
      </button>
      } @default { @switch (column.type) { @case ('currency') { {{ row[column.field] | currency }} } @case ('date') { {{ row[column.field] | date:'MM/dd/yyyy' }} } @default { {{ row[column.field] }} } } } }
    </ng-template>
  </rms-base-table>
</div>
```

## Files Created

| File                                                     | Purpose        |
| -------------------------------------------------------- | -------------- |
| `account-panel/dividend-deposits/dividend-deposits.ts`   | Main component |
| `account-panel/dividend-deposits/dividend-deposits.html` | Template       |
| `account-panel/dividend-deposits/dividend-deposits.scss` | Styles         |

## Performance Testing Checklist

- [ ] Test with 100 records - baseline
- [ ] Test with 500 records - should feel same
- [ ] Test with 1000 records - should feel same
- [ ] Test with 5000 records - should still be smooth
- [ ] Measure initial render time
- [ ] Measure scroll frame rate
- [ ] Verify lazy loading triggers correctly
- [ ] Verify no memory leaks

## Definition of Done

- [ ] Virtual scrolling renders only visible rows
- [ ] Lazy loading fetches data correctly
- [ ] Add dividend opens modal
- [ ] Edit dividend opens modal
- [ ] Delete dividend with confirmation
- [ ] Performance tested with large datasets
- [ ] SmartNgRX integration working
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

**CRITICAL: This is the PRIMARY DRIVER for migration - extensive e2e testing required**

### Core Functionality

- [ ] Virtual scrolling renders only visible rows in DOM
- [ ] Scrolling triggers lazy loading of additional data
- [ ] Loading indicator shows during data fetch
- [ ] Add dividend button opens modal
- [ ] Add dividend modal saves and closes
- [ ] Clicking row opens edit modal
- [ ] Edit dividend modal updates and closes
- [ ] Delete dividend shows confirmation
- [ ] Delete removes row after confirmation
- [ ] Performance test: 1000+ rows scrolls at 60fps
- [ ] Performance test: lazy load completes < 200ms
- [ ] Performance test: no memory leaks after navigation cycles

### Edge Cases - Virtual Scrolling (CRITICAL)

- [ ] Rapid scroll to end loads all required data correctly
- [ ] Scroll position maintained after add/edit/delete operations
- [ ] Scroll position maintained after modal close
- [ ] No duplicate rows during fast scrolling
- [ ] Buffer renders correctly at list boundaries
- [ ] Single dividend renders correctly (boundary)
- [ ] Exactly viewport-height dividends renders correctly
- [ ] Variable network latency handled gracefully

### Edge Cases - CRUD Operations

- [ ] Add dividend with duplicate symbol/date warns or prevents
- [ ] Edit dividend optimistic update with rollback on error
- [ ] Delete multiple dividends sequentially works
- [ ] Delete during scroll handled correctly
- [ ] Add dividend scroll position behavior (scroll to new or not)
- [ ] Cancel edit preserves original data
- [ ] Network error during save shows retry option
- [ ] Concurrent edits to same dividend handled

### Edge Cases - Data Integrity

- [ ] Ex-date before pay-date validation
- [ ] Future ex-date allowed (upcoming dividends)
- [ ] Amount validation (positive numbers only)
- [ ] Shares validation (positive integers)
- [ ] Total calculation (amount \* shares) displayed correctly
- [ ] Filter by symbol works with virtual scroll
- [ ] Sort maintains correct order during lazy load
- [ ] Date range filter works correctly

### Edge Cases - Performance (CRITICAL)

- [ ] 5000 rows maintains smooth scrolling
- [ ] 10000 rows does not crash browser
- [ ] CPU usage stable during scrolling
- [ ] Memory growth bounded during scrolling
- [ ] GC pauses minimal during scrolling
- [ ] First contentful paint < 500ms

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.

## Notes

**THIS IS THE MOST CRITICAL STORY IN THE ENTIRE MIGRATION**

The primary driver for migrating from PrimeNG to Angular Material is to fix virtual scrolling with lazy data fetching in tables. This component is the proof that the migration achieves its goal. Extensive testing is required.
