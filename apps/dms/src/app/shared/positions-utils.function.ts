/* eslint-disable @smarttools/one-exported-item-per-file -- Related utility functions */

export function getSortIcon(
  currentField: string,
  field: string,
  order: number
): string {
  if (currentField === field) {
    return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }
  return 'pi pi-sort';
}

export function getSortOrderDisplay(
  currentField: string,
  field: string,
  order: number
): string {
  if (currentField === field) {
    return order === 1 ? '1' : '2';
  }
  return '';
}

interface SortHandlerOptions {
  field: string;
  currentField: string;
  currentOrder: number;
  onFieldChange(field: string): void;
  onOrderChange(order: number): void;
  onSave(field: string, order: number): void;
}

export function handleSort(options: SortHandlerOptions): void {
  if (options.currentField === options.field) {
    const newOrder = options.currentOrder === 1 ? -1 : 1;
    options.onOrderChange(newOrder);
    options.onSave(options.field, newOrder);
  } else {
    options.onFieldChange(options.field);
    options.onOrderChange(1);
    options.onSave(options.field, 1);
  }
}

export function handleSymbolFilterChange(
  newValue: string,
  onSave: (value: string) => void
): void {
  onSave(newValue);
}

export function compareValues(
  aValue: unknown,
  bValue: unknown,
  sortOrder: number
): number {
  if (aValue === bValue) {
    return 0;
  }
  if (aValue === null || aValue === undefined) {
    return sortOrder;
  }
  if (bValue === null || bValue === undefined) {
    return -sortOrder;
  }

  let comparison: number;
  if (aValue < bValue) {
    comparison = -1;
  } else if (aValue > bValue) {
    comparison = 1;
  } else {
    comparison = 0;
  }
  return comparison * sortOrder;
}
