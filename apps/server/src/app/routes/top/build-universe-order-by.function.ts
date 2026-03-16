import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

const UNIVERSE_DIRECT_SORT_FIELDS = new Set([
  'symbol',
  'distribution',
  'distributions_per_year',
  'last_price',
  'ex_date',
  'expired',
]);

export function buildUniverseOrderBy(
  state: TableState
): Prisma.universeOrderByWithRelationInput {
  const sort = state.sort;
  if (sort === undefined) {
    return { createdAt: 'asc' };
  }
  if (sort.field === 'risk_group') {
    return { risk_group: { name: sort.order } };
  }
  if (UNIVERSE_DIRECT_SORT_FIELDS.has(sort.field)) {
    return { [sort.field]: sort.order };
  }
  // For computed fields (yield_percent, avg_purchase_yield_percent), fall back to default
  return { createdAt: 'asc' };
}
