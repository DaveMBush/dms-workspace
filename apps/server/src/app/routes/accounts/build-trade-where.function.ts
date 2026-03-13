import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

export function buildTradeWhere(
  state: TableState,
  accountId: string,
  isOpen: boolean
): Prisma.tradesWhereInput {
  const where: Prisma.tradesWhereInput = { accountId };
  if (isOpen) {
    where.OR = [{ sell_date: null }, { sell: 0 }];
  } else {
    where.sell_date = { not: null };
    where.sell = { gt: 0 };
  }
  const filters = state.filters;
  if (filters === undefined) {
    return where;
  }
  if (typeof filters['symbol'] === 'string' && filters['symbol'] !== '') {
    where.universe = { symbol: { contains: filters['symbol'] } };
  }
  if (typeof filters['startDate'] === 'string') {
    const startDate = new Date(filters['startDate']);
    if (!isNaN(startDate.getTime())) {
      where.sell_date = {
        ...(where.sell_date as object),
        gte: startDate,
      };
    }
  }
  if (typeof filters['endDate'] === 'string') {
    const endDate = new Date(filters['endDate']);
    if (!isNaN(endDate.getTime())) {
      endDate.setHours(23, 59, 59, 999);
      where.sell_date = {
        ...(where.sell_date as object),
        lte: endDate,
      };
    }
  }
  return where;
}
