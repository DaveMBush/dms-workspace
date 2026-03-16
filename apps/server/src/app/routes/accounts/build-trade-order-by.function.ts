import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

const DIRECT_SORT_FIELDS = new Set([
  'buy',
  'sell',
  'buy_date',
  'sell_date',
  'quantity',
]);

export function buildTradeOrderBy(
  state: TableState
): Prisma.tradesOrderByWithRelationInput {
  const sort = state.sort;
  if (sort === undefined) {
    return { createdAt: 'asc' };
  }
  const field = sort.field;
  // Map frontend field names to DB column names
  if (field === 'openDate') {
    return { buy_date: sort.order };
  }
  if (field === 'closeDate') {
    return { sell_date: sort.order };
  }
  if (field === 'symbol') {
    return { universe: { symbol: sort.order } };
  }
  if (DIRECT_SORT_FIELDS.has(field)) {
    return { [field]: sort.order };
  }
  // Computed fields are handled by in-memory sort in the caller
  return { createdAt: 'asc' };
}
