import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

const DIRECT_SORT_FIELDS = new Set([
  'buy',
  'sell',
  'buy_date',
  'sell_date',
  'quantity',
]);

function buildTradeOrderByFromField(
  field: string,
  order: 'asc' | 'desc'
): Prisma.tradesOrderByWithRelationInput {
  // Map frontend field names to DB column names
  if (field === 'openDate') {
    return { buy_date: order };
  }
  if (field === 'closeDate') {
    return { sell_date: order };
  }
  if (field === 'symbol') {
    return { universe: { symbol: order } };
  }
  if (DIRECT_SORT_FIELDS.has(field)) {
    return { [field]: order };
  }
  // Computed fields are handled by in-memory sort in the caller
  return { createdAt: 'asc' };
}

export function buildTradeOrderBy(
  state: TableState
): Prisma.tradesOrderByWithRelationInput {
  // Check sortColumns first (format sent by interceptor via migrateTableState)
  if (state.sortColumns !== undefined && state.sortColumns.length > 0) {
    const sc = state.sortColumns[0];
    return buildTradeOrderByFromField(sc.column, sc.direction);
  }
  // Fallback to legacy sort format
  const sort = state.sort;
  if (sort === undefined) {
    return { createdAt: 'asc' };
  }
  return buildTradeOrderByFromField(sort.field, sort.order);
}
