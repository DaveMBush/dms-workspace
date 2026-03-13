import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

export function buildDivDepositOrderBy(
  state: TableState
): Prisma.divDepositsOrderByWithRelationInput {
  const sort = state.sort;
  if (sort === undefined) {
    return { date: 'desc' };
  }
  if (sort.field === 'symbol') {
    return { universe: { symbol: sort.order } };
  }
  if (sort.field === 'date' || sort.field === 'amount') {
    return { [sort.field]: sort.order };
  }
  return { date: 'desc' };
}
