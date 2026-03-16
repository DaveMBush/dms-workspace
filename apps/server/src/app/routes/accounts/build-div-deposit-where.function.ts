import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

export function buildDivDepositWhere(
  state: TableState,
  accountId: string
): Prisma.divDepositsWhereInput {
  const where: Prisma.divDepositsWhereInput = { accountId };
  const filters = state.filters;
  if (filters === undefined) {
    return where;
  }
  if (typeof filters['startDate'] === 'string') {
    where.date = {
      ...(where.date as object),
      gte: new Date(filters['startDate']),
    };
  }
  if (typeof filters['endDate'] === 'string') {
    where.date = {
      ...(where.date as object),
      lte: new Date(filters['endDate']),
    };
  }
  return where;
}
