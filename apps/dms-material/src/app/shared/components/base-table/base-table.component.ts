import { SelectionModel } from '@angular/cdk/collections';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ContentChild,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { ColumnDef } from './column-def.interface';

@Component({
  selector: 'dms-base-table',
  imports: [
    CommonModule,
    ScrollingModule,
    MatTableModule,
    MatSortModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTableComponent<T extends { id: string }> {
  // Inputs
  data = input.required<T[]>(); // Signal-based data input
  columns = input.required<ColumnDef[]>();
  rowHeight = input<number>(48);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);
  loading = input<boolean>(false);

  // Outputs
  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();

  // ViewChild for virtual scroll viewport
  viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  // Internal state
  selection = new SelectionModel<T>(true, []);
  private sortState = signal<Sort | null>(null);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Force change detection when dataSource changes
    // This ensures MatTable and virtual scroll viewport update properly
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const context = this;
        // Read the signal to track it
        context.dataSource();
        // Mark for check to trigger change detection in OnPush component
        context.cdr.markForCheck();
      }
    );
  }

  // Helper to check if row has expired property
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  isExpired$ = (row: T): boolean => {
    return (
      'expired' in row && (row as T & { expired?: boolean }).expired === true
    );
  };

  // Helper to read gainLossType from a row when present
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossType$ = (row: T): 'gain' | 'loss' | 'neutral' | undefined => {
    if ('gainLossType' in row) {
      return (row as T & { gainLossType?: 'gain' | 'loss' | 'neutral' })
        .gainLossType;
    }
    return undefined;
  };

  // Data source - reactive to data() changes
  // Returns sorted array directly - MatTable can work with arrays
  dataSource = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const context = this;
      const dataValue = context.data();
      const sortValue = context.sortState();
      return context.applySortToData(dataValue, sortValue);
    }
  );

  displayedColumns = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const context = this;
      const columnsValue = context.columns();
      const cols = columnsValue.map(function getField(c) {
        return c.field;
      });
      const selectableValue = context.selectable();
      if (selectableValue) {
        return ['select', ...cols];
      }
      return cols;
    }
  );

  filterColumns = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      const context = this;
      const columnsValue = context.columns();
      const cols = columnsValue.map(function getFilterField(c) {
        return c.field + 'Filter';
      });
      const selectableValue = context.selectable();
      if (selectableValue) {
        return ['selectFilter', ...cols];
      }
      return cols;
    }
  );

  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<unknown>;
  @ContentChild('filterRowTemplate') filterRowTemplate?: TemplateRef<unknown>;

  onSort(sort: Sort): void {
    this.sortState.set(sort);
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
    const numRows = this.dataSource().length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    const allSelected = this.isAllSelected();
    if (allSelected) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource());
    }
    this.selectionChange.emit(this.selection.selected);
  }

  trackByFn(index: number, item: T): string {
    return item.id;
  }

  scrollToTop(): void {
    const viewportValue = this.viewport();
    if (viewportValue) {
      viewportValue.scrollToIndex(0);
    }
  }

  private applySortToData(dataValue: T[], sortValue: Sort | null): T[] {
    if (
      sortValue === null ||
      sortValue.active.length === 0 ||
      sortValue.direction.length === 0
    ) {
      return [...dataValue];
    }

    return this.sortData(dataValue, sortValue);
  }

  private sortData(dataValue: T[], sortValue: Sort): T[] {
    return [...dataValue].sort(function compare(a: T, b: T) {
      const aValue = (a as Record<string, unknown>)[sortValue.active];
      const bValue = (b as Record<string, unknown>)[sortValue.active];

      if (aValue === bValue) {
        return 0;
      }

      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      const comparison =
        (aValue as number | string) < (bValue as number | string) ? -1 : 1;
      return sortValue.direction === 'asc' ? comparison : -comparison;
    });
  }
}
