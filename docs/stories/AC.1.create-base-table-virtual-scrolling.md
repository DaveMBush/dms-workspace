# Story AC.1: Create Base Table Component with Virtual Scrolling

## Story

**As a** user viewing large datasets
**I want** tables that load data efficiently with smooth scrolling
**So that** I can browse thousands of rows without performance issues

## Context

**Current System:**

- PrimeNG `p-table` with `[virtualScroll]="true"` and `[lazy]="true"`
- Virtual scroll item size configured
- Lazy loading callback on scroll

**Problem:**

- PrimeNG's virtual scrolling with lazy data fetching does not meet requirements
- This is the PRIMARY DRIVER for the entire migration

**Migration Target:**

- Angular CDK `cdk-virtual-scroll-viewport` for virtualization
- Angular Material `mat-table` for table structure
- Custom lazy loading data source

## Acceptance Criteria

### Functional Requirements

- [ ] Table renders with virtual scrolling enabled
- [ ] All GUI look as close to the existing DMS app as possible
- [ ] Only visible rows + buffer rendered in DOM
- [ ] Lazy loading triggers when scrolling near data boundary
- [ ] Loading indicator shown during data fetch
- [ ] Sorting supported (click column headers)
- [ ] Data updates reflect immediately
- [ ] Row selection supported (single and multi)

### Technical Requirements

- [ ] Uses `cdk-virtual-scroll-viewport` for virtualization
- [ ] Uses `mat-table` for table structure
- [ ] Custom `DataSource` implementing `CollectionViewer`
- [ ] Configurable row height for accurate scrolling
- [ ] Configurable lazy loading threshold
- [ ] TrackBy function for performance
- [ ] Generic component supporting any entity type

### Performance Requirements

- [ ] 1000+ rows scroll smoothly (60fps)
- [ ] Initial render under 100ms
- [ ] Lazy load requests debounced
- [ ] No memory leaks on destroy

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

**VirtualTableDataSource Tests** - `apps/dms-material/src/app/shared/components/base-table/virtual-table-data-source.spec.ts`:

```typescript
import { VirtualTableDataSource, LazyLoadEvent } from './virtual-table-data-source';
import { of } from 'rxjs';

describe('VirtualTableDataSource', () => {
  let dataSource: VirtualTableDataSource<{ id: string; name: string }>;
  let mockLoadFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLoadFn = vi.fn().mockReturnValue(of({ data: [], total: 0 }));
    dataSource = new VirtualTableDataSource(mockLoadFn);
  });

  afterEach(() => {
    dataSource.disconnect();
  });

  it('should call loadFn on loadInitialData', () => {
    dataSource.loadInitialData();
    expect(mockLoadFn).toHaveBeenCalledWith({ first: 0, rows: 50 });
  });

  it('should emit loading state', (done) => {
    mockLoadFn.mockReturnValue(of({ data: [{ id: '1', name: 'Test' }], total: 1 }));
    dataSource.loading$.subscribe((loading) => {
      if (!loading) done();
    });
    dataSource.loadInitialData();
  });

  it('should cache loaded data', () => {
    mockLoadFn.mockReturnValue(of({ data: [{ id: '1', name: 'Test' }], total: 10 }));
    dataSource.loadInitialData();
    expect(dataSource.getData().length).toBe(1);
  });

  it('should return total records', () => {
    mockLoadFn.mockReturnValue(of({ data: [], total: 100 }));
    dataSource.loadInitialData();
    expect(dataSource.getTotalRecords()).toBe(100);
  });

  it('should update single row', () => {
    mockLoadFn.mockReturnValue(of({ data: [{ id: '1', name: 'Test' }], total: 1 }));
    dataSource.loadInitialData();
    dataSource.updateRow(0, { id: '1', name: 'Updated' });
    expect(dataSource.getData()[0].name).toBe('Updated');
  });
});
```

**BaseTableComponent Tests** - `apps/dms-material/src/app/shared/components/base-table/base-table.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseTableComponent, ColumnDef } from './base-table.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('BaseTableComponent', () => {
  let component: BaseTableComponent<{ id: string; name: string }>;
  let fixture: ComponentFixture<BaseTableComponent<{ id: string; name: string }>>;

  const columns: ColumnDef[] = [{ field: 'name', header: 'Name', sortable: true }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTableComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
  });

  it('should compute displayed columns', () => {
    expect(component.displayedColumns()).toContain('name');
  });

  it('should include select column when selectable', () => {
    fixture.componentRef.setInput('selectable', true);
    expect(component.displayedColumns()).toContain('select');
  });

  it('should emit sortChange on sort', () => {
    const spy = vi.spyOn(component.sortChange, 'emit');
    component.onSort({ active: 'name', direction: 'asc' });
    expect(spy).toHaveBeenCalled();
  });

  it('should emit rowClick on row click', () => {
    const spy = vi.spyOn(component.rowClick, 'emit');
    component.onRowClick({ id: '1', name: 'Test' });
    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'Test' });
  });

  it('should toggle selection', () => {
    const row = { id: '1', name: 'Test' };
    component.toggleSelection(row);
    expect(component.selection.isSelected(row)).toBe(true);
  });

  it('should track by id', () => {
    expect(component.trackByFn(0, { id: '123', name: 'Test' })).toBe('123');
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run dms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

### Step 1: Create Virtual Table Data Source

Create `apps/dms-material/src/app/shared/components/base-table/virtual-table-data-source.ts`:

```typescript
import { DataSource, CollectionViewer } from '@angular/cdk/collections';
import { Observable, BehaviorSubject, Subscription, Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

export interface LazyLoadEvent {
  first: number;
  rows: number;
}

export class VirtualTableDataSource<T> extends DataSource<T> {
  private dataSubject = new BehaviorSubject<T[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private subscription: Subscription | null = null;

  loading$ = this.loadingSubject.asObservable();

  private cachedData: T[] = [];
  private totalRecords = 0;
  private pageSize = 50;
  private loadThreshold = 10; // Load more when within 10 rows of boundary

  constructor(private loadFn: (event: LazyLoadEvent) => Observable<{ data: T[]; total: number }>) {
    super();
  }

  connect(collectionViewer: CollectionViewer): Observable<T[]> {
    const context = this;

    this.subscription = collectionViewer.viewChange.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe(function onViewChange(range) {
      context.checkAndLoadData(range.start, range.end);
    });

    return this.dataSubject.asObservable();
  }

  disconnect(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dataSubject.complete();
    this.loadingSubject.complete();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private checkAndLoadData(start: number, end: number): void {
    // Check if we need to load more data
    const loadedEnd = this.cachedData.length;

    if (end >= loadedEnd - this.loadThreshold && loadedEnd < this.totalRecords) {
      this.loadMoreData(loadedEnd);
    }
  }

  private loadMoreData(offset: number): void {
    if (this.loadingSubject.value) {
      return; // Already loading
    }

    this.loadingSubject.next(true);

    const context = this;
    this.loadFn({ first: offset, rows: this.pageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: function onData(result) {
          context.cachedData = [...context.cachedData, ...result.data];
          context.totalRecords = result.total;
          context.dataSubject.next(context.cachedData);
          context.loadingSubject.next(false);
        },
        error: function onError() {
          context.loadingSubject.next(false);
        },
      });
  }

  // Initial load
  loadInitialData(): void {
    this.cachedData = [];
    this.loadMoreData(0);
  }

  // Refresh all data
  refresh(): void {
    this.cachedData = [];
    this.totalRecords = 0;
    this.loadMoreData(0);
  }

  // Update a single row
  updateRow(index: number, data: T): void {
    if (index >= 0 && index < this.cachedData.length) {
      this.cachedData[index] = data;
      this.dataSubject.next([...this.cachedData]);
    }
  }

  // Get current data
  getData(): T[] {
    return this.cachedData;
  }

  getTotalRecords(): number {
    return this.totalRecords;
  }
}
```

### Step 2: Create Base Table Component

Create `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`:

```typescript
import { Component, input, output, contentChildren, AfterContentInit, signal, computed, TemplateRef, ContentChild } from '@angular/core';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

import { VirtualTableDataSource, LazyLoadEvent } from './virtual-table-data-source';

export interface ColumnDef {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'currency' | 'custom';
}

@Component({
  selector: 'dms-base-table',
  imports: [ScrollingModule, MatTableModule, MatSortModule, MatProgressBarModule, MatCheckboxModule],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
})
export class BaseTableComponent<T extends { id: string }> implements AfterContentInit {
  // Inputs
  columns = input.required<ColumnDef[]>();
  rowHeight = input<number>(48);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);

  // Outputs
  sortChange = output<Sort>();
  rowClick = output<T>();
  selectionChange = output<T[]>();
  lazyLoad = output<LazyLoadEvent>();

  // Data source
  dataSource!: VirtualTableDataSource<T>;

  // Selection
  selection = new SelectionModel<T>(true, []);

  // Computed
  displayedColumns = computed(() => {
    const cols = this.columns().map((c) => c.field);
    if (this.selectable()) {
      return ['select', ...cols];
    }
    return cols;
  });

  // Custom cell templates
  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<unknown>;
  @ContentChild('headerTemplate') headerTemplate?: TemplateRef<unknown>;

  ngAfterContentInit(): void {
    // Initialize after content is available
  }

  initDataSource(loadFn: (event: LazyLoadEvent) => ReturnType<VirtualTableDataSource<T>['loadFn']>): void {
    this.dataSource = new VirtualTableDataSource<T>(loadFn);
    this.dataSource.loadInitialData();
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  toggleSelection(row: T): void {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource?.getData().length ?? 0;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource.getData());
    }
    this.selectionChange.emit(this.selection.selected);
  }

  trackByFn(index: number, item: T): string {
    return item.id;
  }

  refresh(): void {
    this.dataSource?.refresh();
  }
}
```

### Step 3: Create Base Table Template

Create `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`:

```html
<div class="table-container">
  @if (dataSource?.loading$ | async) {
  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
  }

  <cdk-virtual-scroll-viewport [itemSize]="rowHeight()" [minBufferPx]="rowHeight() * bufferSize()" [maxBufferPx]="rowHeight() * bufferSize() * 2" class="virtual-scroll-viewport">
    <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)" [trackBy]="trackByFn">
      <!-- Selection Column -->
      @if (selectable()) {
      <ng-container matColumnDef="select">
        <th mat-header-cell *matHeaderCellDef>
          @if (multiSelect()) {
          <mat-checkbox [checked]="isAllSelected()" [indeterminate]="selection.hasValue() && !isAllSelected()" (change)="toggleAllRows()"></mat-checkbox>
          }
        </th>
        <td mat-cell *matCellDef="let row">
          <mat-checkbox [checked]="selection.isSelected(row)" (click)="$event.stopPropagation()" (change)="toggleSelection(row)"></mat-checkbox>
        </td>
      </ng-container>
      }

      <!-- Dynamic Columns -->
      @for (column of columns(); track column.field) {
      <ng-container [matColumnDef]="column.field">
        <th mat-header-cell *matHeaderCellDef [mat-sort-header]="column.sortable ? column.field : ''" [disabled]="!column.sortable" [style.width]="column.width">{{ column.header }}</th>
        <td mat-cell *matCellDef="let row" (click)="onRowClick(row)">
          <ng-container [ngTemplateOutlet]="cellTemplate || defaultCell" [ngTemplateOutletContext]="{ $implicit: row, column: column }"></ng-container>
        </td>
      </ng-container>
      }

      <tr mat-header-row *matHeaderRowDef="displayedColumns(); sticky: true"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns()" [class.selected]="selection.isSelected(row)"></tr>
    </table>
  </cdk-virtual-scroll-viewport>
</div>

<!-- Default cell template -->
<ng-template #defaultCell let-row let-column="column"> @switch (column.type) { @case ('currency') { {{ row[column.field] | currency }} } @case ('date') { {{ row[column.field] | date:'shortDate' }} } @case ('number') { {{ row[column.field] | number }} } @default { {{ row[column.field] }} } } </ng-template>
```

### Step 4: Create Base Table Styles

Create `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`:

```scss
.table-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.virtual-scroll-viewport {
  flex: 1;
  overflow: auto;
}

mat-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

table {
  width: 100%;
}

tr.mat-mdc-row {
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  &.selected {
    background-color: rgba(var(--dms-primary-500), 0.1);
  }
}

th.mat-mdc-header-cell {
  font-weight: 600;
  background-color: var(--dms-surface);
  position: sticky;
  top: 0;
  z-index: 1;
}

td.mat-mdc-cell {
  padding: 8px 16px;
}

.dark-theme {
  tr.mat-mdc-row:hover {
    background-color: rgba(255, 255, 255, 0.04);
  }
}
```

## Files Created

| File                                                        | Purpose                              |
| ----------------------------------------------------------- | ------------------------------------ |
| `shared/components/base-table/virtual-table-data-source.ts` | Custom data source with lazy loading |
| `shared/components/base-table/base-table.component.ts`      | Base table component                 |
| `shared/components/base-table/base-table.component.html`    | Table template                       |
| `shared/components/base-table/base-table.component.scss`    | Table styles                         |

## Usage Example

```typescript
// In a feature component
export class MyTableComponent implements OnInit {
  @ViewChild(BaseTableComponent) table!: BaseTableComponent<MyEntity>;

  columns: ColumnDef[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'value', header: 'Value', type: 'currency' },
    { field: 'date', header: 'Date', type: 'date' },
  ];

  ngOnInit(): void {
    this.table.initDataSource((event) => this.myService.loadData(event.first, event.rows));
  }
}
```

## Definition of Done

- [ ] Virtual scrolling renders only visible rows
- [ ] Lazy loading fetches data on scroll
- [ ] Loading indicator shows during fetch
- [ ] Sorting emits sort events
- [ ] Row click emits row data
- [ ] Selection works (single and multi)
- [ ] Custom cell templates supported
- [ ] Performance verified with 1000+ rows
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] Table renders with virtual scrolling enabled
- [ ] Only visible rows plus buffer are in DOM
- [ ] Scrolling loads more data (lazy loading)
- [ ] Loading indicator shows during data fetch
- [ ] Column header click triggers sort
- [ ] Row click triggers row selection
- [ ] Multi-select checkbox works correctly
- [ ] Performance test with 1000+ rows maintains 60fps

### Edge Cases - Virtual Scrolling

- [ ] Rapid scroll to end of list loads all required data
- [ ] Scroll position maintained after data refresh
- [ ] Empty state displayed when no data exists
- [ ] Single row renders correctly (boundary case)
- [ ] Exactly buffer-size rows renders correctly
- [ ] Variable row heights handled correctly (if supported)
- [ ] Scroll to specific index via API works correctly
- [ ] Memory usage stable after scrolling through entire dataset
- [ ] No duplicate rows rendered during fast scrolling

### Edge Cases - Lazy Loading

- [ ] Concurrent data requests are properly debounced
- [ ] Failed data load shows error and retry option
- [ ] Network timeout handled gracefully with retry
- [ ] Partial data load (some rows fail) handled gracefully
- [ ] Data source update during scroll handled correctly
- [ ] Sort change during lazy load cancels pending request

### Edge Cases - Selection

- [ ] Select all with virtual scroll selects all data (not just visible)
- [ ] Shift+click range selection works across scroll boundaries
- [ ] Selection state preserved after scroll and return
- [ ] Deselect all clears selection including non-visible rows
- [ ] Selection count displays correctly for large selections

### Edge Cases - Accessibility

- [ ] Keyboard navigation works (Arrow keys, Page Up/Down, Home/End)
- [ ] Screen reader announces row count and current position
- [ ] Focus management correct during lazy load
- [ ] ARIA attributes updated during virtual scroll

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.
