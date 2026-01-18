# BaseTable Quick Reference

## Basic Usage

```typescript
import { Component, computed, signal } from '@angular/core';
import { BaseTableComponent } from './base-table.component';

@Component({
  template: ` <dms-base-table [data]="tableData()" [columns]="columns" [loading]="isLoading()" /> `,
})
export class MyComponent {
  tableData = signal<MyData[]>([]);
  isLoading = signal(false);
  columns = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'value', header: 'Value', sortable: true },
  ];
}
```

## Inputs

| Input         | Type          | Required | Default | Description                          |
| ------------- | ------------- | -------- | ------- | ------------------------------------ |
| `data`        | `T[]`         | ✅ Yes   | -       | Array of table data (must be signal) |
| `columns`     | `ColumnDef[]` | ✅ Yes   | -       | Column definitions                   |
| `loading`     | `boolean`     | ❌ No    | `false` | Loading state indicator              |
| `rowHeight`   | `number`      | ❌ No    | `48`    | Height of each row in pixels         |
| `bufferSize`  | `number`      | ❌ No    | `10`    | Virtual scroll buffer size           |
| `selectable`  | `boolean`     | ❌ No    | `false` | Enable row selection                 |
| `multiSelect` | `boolean`     | ❌ No    | `false` | Allow multiple row selection         |

## Outputs

| Output            | Type   | Description                    |
| ----------------- | ------ | ------------------------------ |
| `sortChange`      | `Sort` | Emitted when sort changes      |
| `rowClick`        | `T`    | Emitted when row is clicked    |
| `selectionChange` | `T[]`  | Emitted when selection changes |

## With SmartNgRX

```typescript
readonly data = injectSignals('myData', adapter.getSelectors().selectAll);
readonly loading = injectSignals('myData', selectIsLoadingMyData);

// In template
<dms-base-table
  [data]="data()"
  [loading]="loading()"
  [columns]="columns"
/>
```

## With Filtering

```typescript
private sourceData = signal<Data[]>([]);
private filterText = signal('');

filteredData = computed(() => {
  const data = this.sourceData();
  const filter = this.filterText();
  return filter ? data.filter(/* filter logic */) : data;
});

// In template
<dms-base-table [data]="filteredData()" [columns]="columns" />
```

## Column Definition

```typescript
interface ColumnDef {
  field: string; // Property name in data object
  header: string; // Display header text
  width?: string; // CSS width (e.g., '100px', '20%')
  sortable?: boolean; // Enable sorting for this column
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'custom';
}
```

## Custom Cell Templates

```html
<dms-base-table [data]="data()" [columns]="columns">
  <ng-template #cellTemplate let-row let-column="column">
    @if (column.field === 'status') {
    <span [class]="'status-' + row.status">{{ row.status }}</span>
    }
  </ng-template>
</dms-base-table>
```

## Selection

```typescript
<dms-base-table
  [data]="data()"
  [columns]="columns"
  [selectable]="true"
  [multiSelect]="true"
  (selectionChange)="onSelectionChange($event)"
/>

onSelectionChange(selected: MyData[]): void {
  console.log('Selected items:', selected);
}
```

## Methods

```typescript
@ViewChild(BaseTableComponent) table!: BaseTableComponent<MyData>;

scrollToTop(): void {
  this.table.scrollToTop();
}
```

## Migration Checklist

- [ ] Remove `@ViewChild(BaseTableComponent)`
- [ ] Remove `ngAfterViewInit()` with `initDataSource()`
- [ ] Remove `refresh()` / `refreshTable()` methods
- [ ] Add `[data]="yourSignal()"` to template
- [ ] Add `[loading]="loadingSignal()"` to template (optional)
- [ ] Remove manual refresh calls
- [ ] Test that table updates automatically with signal changes

## Common Patterns

### Load Data on Init

```typescript
constructor() {
  // SmartNgRX handles this automatically
  effect(() => {
    // Data loads automatically via SmartNgRX
  });
}
```

### Handle Empty State

```html
@if (data().length === 0 && !loading()) {
<div class="empty-state">No data available</div>
} @else {
<dms-base-table [data]="data()" [columns]="columns" />
}
```

### Sorting

```typescript
// Built-in sorting is automatic
// Optional: Listen to sort changes for server-side sorting
onSortChange(sort: Sort): void {
  // Optionally fetch sorted data from server
  this.fetchSortedData(sort.active, sort.direction);
}
```
