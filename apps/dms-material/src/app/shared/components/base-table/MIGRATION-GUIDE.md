# BaseTable Migration Guide

## Overview

The `BaseTableComponent` has been refactored to use Angular signals and support SmartNgRX's reactive data patterns. This guide explains the changes and how to migrate existing code.

## What Changed

### Before (Old Pattern)

- Used imperative `initDataSource()` method
- Required RxJS Observable-based `loadFn`
- Data source was disconnected from signals
- Had to manually call `refresh()` when data changed

### After (New Pattern)

- Uses signal input `data()`
- Automatically reacts to signal changes
- Built-in sorting with signal state
- Cleaner, more declarative API

## Migration Steps

### 1. Remove ViewChild and initDataSource

**Before:**

```typescript
@ViewChild(BaseTableComponent) table!: BaseTableComponent<Screen>;

ngAfterViewInit(): void {
  this.table.initDataSource(function loadScreenData() {
    const data = context.filteredData$();
    return of({ data, total: data.length });
  });
}
```

**After:**

```typescript
// No ViewChild needed unless you need to call methods like scrollToTop()
```

### 2. Pass Data as Signal Input

**Before:**

```html
<dms-base-table [columns]="columns" [selectable]="false" (sortChange)="onSortChange($event)"> </dms-base-table>
```

**After:**

```html
<dms-base-table [data]="filteredData$()" [columns]="columns" [selectable]="false" [loading]="loading()" (sortChange)="onSortChange($event)"> </dms-base-table>
```

### 3. Remove Manual Refresh Calls

**Before:**

```typescript
onRiskGroupFilterChange(value: string | null): void {
  this.riskGroupFilter$.set(value);
  this.refreshTable(); // ❌ Manual refresh
}

refreshTable(): void {
  this.table?.refresh();
}
```

**After:**

```typescript
onRiskGroupFilterChange(value: string | null): void {
  this.riskGroupFilter$.set(value);
  // ✅ Table automatically updates because filteredData$ is reactive
}
```

### 4. Handle Sorting (Optional - Built-in)

The table now has built-in sorting. If you don't need server-side sorting:

**Before:**

```typescript
onSortChange(sort: Sort): void {
  this.sortField$.set(sort.active);
  this.sortDirection$.set(sort.direction);
  this.refreshTable();
}
```

**After:**

```typescript
onSortChange(sort: Sort): void {
  // ✅ Sorting is handled automatically by the table
  // Only implement this if you need to do something additional
  // like server-side sorting or tracking
}
```

## Complete Example

### Before:

```typescript
export class GlobalScreenerComponent implements AfterViewInit {
  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Screen>;

  readonly filteredData$ = computed(() => {
    const screens = this.screenerService.screens();
    const riskGroupFilter = this.riskGroupFilter$();
    return riskGroupFilter ? screens.filter((s) => s.risk_group === riskGroupFilter) : screens;
  });

  ngAfterViewInit(): void {
    this.table.initDataSource(() => {
      const data = this.filteredData$();
      return of({ data, total: data.length });
    });
  }

  refreshTable(): void {
    this.table?.refresh();
  }

  onSortChange(sort: Sort): void {
    this.sortField$.set(sort.active);
    this.sortDirection$.set(sort.direction);
    this.refreshTable();
  }
}
```

**Template:**

```html
<dms-base-table [columns]="columns" [selectable]="false" (sortChange)="onSortChange($event)"> </dms-base-table>
```

### After:

```typescript
export class GlobalScreenerComponent {
  // No ViewChild needed!

  readonly filteredData$ = computed(() => {
    const screens = this.screenerService.screens();
    const riskGroupFilter = this.riskGroupFilter$();
    return riskGroupFilter ? screens.filter((s) => s.risk_group === riskGroupFilter) : screens;
  });

  // Optional: Only if you need to track sort changes
  onSortChange(sort: Sort): void {
    // Table handles sorting automatically
  }
}
```

**Template:**

```html
<dms-base-table [data]="filteredData$()" [columns]="columns" [loading]="loading()" [selectable]="false" (sortChange)="onSortChange($event)"> </dms-base-table>
```

## Key Benefits

1. **Automatic Reactivity**: Table updates when source signals change
2. **SmartNgRX Compatible**: Works with progressive data loading
3. **Less Code**: No manual refresh or lifecycle management
4. **Type Safe**: Signal inputs with proper typing
5. **Better Performance**: Computed signals optimize change detection

## Progressive Data Loading (SmartNgRX)

The refactored table works perfectly with SmartNgRX's progressive data pattern:

```typescript
// SmartNgRX loads data progressively
// First: skeleton rows (empty fields)
// Then: actual data as it arrives

readonly screens = injectSignals(
  'screens',
  screensAdapter.getSelectors().selectAll
);

// Pass directly to table - it will update automatically!
```

```html
<dms-base-table [data]="screens()" [loading]="isLoading()" [columns]="columns"> </dms-base-table>
```

The table will:

1. Show skeleton/empty rows initially
2. Automatically update when real data arrives
3. Handle partial updates as SmartNgRX fills in data

## Troubleshooting

### "No data appears in table"

- Make sure you're passing `[data]="yourSignal()"` with the parentheses
- Verify your data signal returns an array

### "Table doesn't update when filter changes"

- Ensure your data is derived from a `computed()` signal
- Check that filter changes update signals properly

### "Need to scroll to top after data change"

- Use `ViewChild` and call `scrollToTop()` method:

  ```typescript
  @ViewChild(BaseTableComponent) table!: BaseTableComponent<T>;

  someAction(): void {
    this.table.scrollToTop();
  }
  ```
