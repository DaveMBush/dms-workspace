import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

function buildDivDepositOrderByFromField(
  field: string,
  order: 'asc' | 'desc'
): Prisma.divDepositsOrderByWithRelationInput {
  if (field === 'symbol') {
    return { universe: { symbol: order } };
  }
  if (field === 'date' || field === 'amount') {
    return { [field]: order };
  }
  return { date: 'desc' };
}

export function buildDivDepositOrderBy(
  state: TableState
): Prisma.divDepositsOrderByWithRelationInput {
  // Check sortColumns first (format sent by interceptor via migrateTableState)
  if (state.sortColumns !== undefined && state.sortColumns.length > 0) {
    const sc = state.sortColumns[0];
    return buildDivDepositOrderByFromField(sc.column, sc.direction);
  }
  // Fallback to legacy sort format
  const sort = state.sort;
  if (sort === undefined) {
    return { date: 'desc' };
  }
  return buildDivDepositOrderByFromField(sort.field, sort.order);
}
