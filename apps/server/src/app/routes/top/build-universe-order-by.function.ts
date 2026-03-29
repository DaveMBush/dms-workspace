import { Prisma } from '@prisma/client';

import { SortColumn } from '../common/sort-column.interface';
import { TableState } from '../common/table-state.interface';

const UNIVERSE_DIRECT_SORT_FIELDS = new Set([
  'symbol',
  'distribution',
  'distributions_per_year',
  'last_price',
  'ex_date',
  'expired',
]);

const DEFAULT_ORDER_BY: Prisma.universeOrderByWithRelationInput[] = [
  { createdAt: 'asc' },
];

function buildOrderByEntry(
  sc: SortColumn
): Prisma.universeOrderByWithRelationInput | undefined {
  if (sc.column === 'risk_group') {
    return { risk_group: { name: sc.direction } };
  }
  if (UNIVERSE_DIRECT_SORT_FIELDS.has(sc.column)) {
    return { [sc.column]: sc.direction };
  }
  return undefined;
}

function buildFromSortColumns(
  sortColumns: SortColumn[]
): Prisma.universeOrderByWithRelationInput[] {
  const result: Prisma.universeOrderByWithRelationInput[] = [];
  for (let i = 0; i < sortColumns.length; i++) {
    const entry: Prisma.universeOrderByWithRelationInput | undefined =
      buildOrderByEntry(sortColumns[i]);
    if (entry !== undefined) {
      result.push(entry);
    }
  }
  return result.length > 0 ? result : DEFAULT_ORDER_BY;
}

function buildFromLegacySort(sort: {
  field: string;
  order: 'asc' | 'desc';
}): Prisma.universeOrderByWithRelationInput[] {
  if (sort.field === 'risk_group') {
    return [{ risk_group: { name: sort.order } }];
  }
  if (UNIVERSE_DIRECT_SORT_FIELDS.has(sort.field)) {
    return [{ [sort.field]: sort.order }];
  }
  return DEFAULT_ORDER_BY;
}

export function buildUniverseOrderBy(
  state: TableState
): Prisma.universeOrderByWithRelationInput[] {
  if (state.sortColumns !== undefined && state.sortColumns.length > 0) {
    return buildFromSortColumns(state.sortColumns);
  }
  if (state.sort !== undefined) {
    return buildFromLegacySort(state.sort);
  }
  return DEFAULT_ORDER_BY;
}
