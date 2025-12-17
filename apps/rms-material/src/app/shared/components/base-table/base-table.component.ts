import { SelectionModel } from '@angular/cdk/collections';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ContentChild,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { ColumnDef } from './column-def.interface';
import { LazyLoadEvent } from './lazy-load-event.interface';
import { VirtualTableDataSource } from './virtual-table-data-source';

@Component({
  selector: 'rms-base-table',
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
  columns = input.required<ColumnDef[]>();
  rowHeight = input<number>(48);
  bufferSize = input<number>(10);
  selectable = input<boolean>(false);
  multiSelect = input<boolean>(false);

  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();
  readonly lazyLoad = output<LazyLoadEvent>();

  dataSource?: VirtualTableDataSource<T>;

  selection = new SelectionModel<T>(true, []);

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

  initDataSource(
    loadFn: (
      event: LazyLoadEvent
    ) => ReturnType<VirtualTableDataSource<T>['loadFn']>
  ): void {
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
    const allSelected = this.isAllSelected();
    if (allSelected) {
      this.selection.clear();
    } else if (this.dataSource) {
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
