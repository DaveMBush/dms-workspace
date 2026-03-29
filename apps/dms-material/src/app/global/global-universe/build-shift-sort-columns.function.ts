import { SortColumn } from '../../shared/services/sort-column.interface';

export function buildShiftSortColumns(
  current: SortColumn[],
  column: string,
  direction: 'asc' | 'desc'
): SortColumn[] {
  const idx = current.findIndex(function matchColumn(sc) {
    return sc.column === column;
  });
  if (idx === -1) {
    return [...current, { column, direction }];
  }
  if (current[idx].direction === 'asc') {
    const updated = [...current];
    updated[idx] = { column, direction: 'desc' };
    return updated;
  }
  return current.filter(function excludeColumn(sc) {
    return sc.column !== column;
  });
}
