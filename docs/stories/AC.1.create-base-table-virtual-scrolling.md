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

## Technical Approach

### Step 1: Create Virtual Table Data Source

Create `apps/rms-material/src/app/shared/components/base-table/virtual-table-data-source.ts`:

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

  constructor(
    private loadFn: (event: LazyLoadEvent) => Observable<{ data: T[]; total: number }>
  ) {
    super();
  }

  connect(collectionViewer: CollectionViewer): Observable<T[]> {
    const context = this;

    this.subscription = collectionViewer.viewChange
      .pipe(
        debounceTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(function onViewChange(range) {
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

Create `apps/rms-material/src/app/shared/components/base-table/base-table.component.ts`:

```typescript
import {
  Component,
  input,
  output,
  contentChildren,
  AfterContentInit,
  signal,
  computed,
  TemplateRef,
  ContentChild,
} from '@angular/core';
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
  selector: 'rms-base-table',
  imports: [
    ScrollingModule,
    MatTableModule,
    MatSortModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
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

Create `apps/rms-material/src/app/shared/components/base-table/base-table.component.html`:

```html
<div class="table-container">
  @if (dataSource?.loading$ | async) {
    <mat-progress-bar mode="indeterminate"></mat-progress-bar>
  }

  <cdk-virtual-scroll-viewport
    [itemSize]="rowHeight()"
    [minBufferPx]="rowHeight() * bufferSize()"
    [maxBufferPx]="rowHeight() * bufferSize() * 2"
    class="virtual-scroll-viewport"
  >
    <table
      mat-table
      [dataSource]="dataSource"
      matSort
      (matSortChange)="onSort($event)"
      [trackBy]="trackByFn"
    >
      <!-- Selection Column -->
      @if (selectable()) {
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef>
            @if (multiSelect()) {
              <mat-checkbox
                [checked]="isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()"
                (change)="toggleAllRows()"
              ></mat-checkbox>
            }
          </th>
          <td mat-cell *matCellDef="let row">
            <mat-checkbox
              [checked]="selection.isSelected(row)"
              (click)="$event.stopPropagation()"
              (change)="toggleSelection(row)"
            ></mat-checkbox>
          </td>
        </ng-container>
      }

      <!-- Dynamic Columns -->
      @for (column of columns(); track column.field) {
        <ng-container [matColumnDef]="column.field">
          <th
            mat-header-cell
            *matHeaderCellDef
            [mat-sort-header]="column.sortable ? column.field : ''"
            [disabled]="!column.sortable"
            [style.width]="column.width"
          >
            {{ column.header }}
          </th>
          <td
            mat-cell
            *matCellDef="let row"
            (click)="onRowClick(row)"
          >
            <ng-container
              [ngTemplateOutlet]="cellTemplate || defaultCell"
              [ngTemplateOutletContext]="{ $implicit: row, column: column }"
            ></ng-container>
          </td>
        </ng-container>
      }

      <tr mat-header-row *matHeaderRowDef="displayedColumns(); sticky: true"></tr>
      <tr
        mat-row
        *matRowDef="let row; columns: displayedColumns()"
        [class.selected]="selection.isSelected(row)"
      ></tr>
    </table>
  </cdk-virtual-scroll-viewport>
</div>

<!-- Default cell template -->
<ng-template #defaultCell let-row let-column="column">
  @switch (column.type) {
    @case ('currency') {
      {{ row[column.field] | currency }}
    }
    @case ('date') {
      {{ row[column.field] | date:'shortDate' }}
    }
    @case ('number') {
      {{ row[column.field] | number }}
    }
    @default {
      {{ row[column.field] }}
    }
  }
</ng-template>
```

### Step 4: Create Base Table Styles

Create `apps/rms-material/src/app/shared/components/base-table/base-table.component.scss`:

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
    background-color: rgba(var(--rms-primary-500), 0.1);
  }
}

th.mat-mdc-header-cell {
  font-weight: 600;
  background-color: var(--rms-surface);
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

| File | Purpose |
|------|---------|
| `shared/components/base-table/virtual-table-data-source.ts` | Custom data source with lazy loading |
| `shared/components/base-table/base-table.component.ts` | Base table component |
| `shared/components/base-table/base-table.component.html` | Table template |
| `shared/components/base-table/base-table.component.scss` | Table styles |

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
    this.table.initDataSource((event) =>
      this.myService.loadData(event.first, event.rows)
    );
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
