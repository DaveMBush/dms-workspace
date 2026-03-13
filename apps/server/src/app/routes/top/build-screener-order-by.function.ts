import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

const SCREENER_DIRECT_SORT_FIELDS = new Set([
  'symbol',
  'distribution',
  'distributions_per_year',
  'last_price',
  'ex_date',
]);

export function buildScreenerOrderBy(
  state: TableState
): Prisma.screenerOrderByWithRelationInput {
  const sort = state.sort;
  if (sort === undefined) {
    return { createdAt: 'asc' };
  }
  if (sort.field === 'risk_group') {
    return { risk_group: { name: sort.order } };
  }
  if (SCREENER_DIRECT_SORT_FIELDS.has(sort.field)) {
    return { [sort.field]: sort.order };
  }
  return { createdAt: 'asc' };
}
