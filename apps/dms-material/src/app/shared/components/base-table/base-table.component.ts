import { ListRange, SelectionModel } from '@angular/cdk/collections';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ContentChild,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';

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
export class BaseTableComponent<T extends { id: string }>
  implements AfterViewInit
{
  // Inputs
  data = input.required<T[]>(); // Signal-based data input
  columns = input.required<ColumnDef[]>();
  tableLabel = input<string>('Data table');
  rowHeight = input<number>(52);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);
  loading = input<boolean>(false);

  // Outputs
  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();
  readonly renderedRangeChange = output<ListRange>();

  // ViewChild for virtual scroll viewport
  viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  // Internal state
  selection = new SelectionModel<T>(true, []);
  private sortState = signal<Sort | null>(null);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

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

  ngAfterViewInit(): void {
    const viewportValue = this.viewport();
    if (viewportValue) {
      viewportValue.renderedRangeStream
        .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
        .subscribe(
          function emitRange(this: BaseTableComponent<T>, range: ListRange) {
            this.renderedRangeChange.emit(range);
          }.bind(this)
        );
    }
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

  // Returns an ngClass-compatible map from the row's gainLossType to avoid
  // triple evaluation of gainLossType$ per change-detection cycle.
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- needed for proper typing
  gainLossClassMap$ = (row: T): Record<string, boolean> => {
    const type = this.gainLossType$(row);
    return {
      gain: type === 'gain',
      loss: type === 'loss',
      neutral: type === 'neutral',
    };
  };

  // Data source - reactive to data() changes
  // Server handles sorting, so no client-side sort is applied
  dataSource = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for computed signal
    () => {
      return [...this.data()];
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
}
