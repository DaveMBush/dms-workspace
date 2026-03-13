import { Prisma } from '@prisma/client';

import { TableState } from '../common/table-state.interface';

export function buildUniverseWhere(
  state: TableState
): Prisma.universeWhereInput {
  const where: Prisma.universeWhereInput = {};
  const filters = state.filters;
  if (filters === undefined) {
    return where;
  }
  if (typeof filters['symbol'] === 'string' && filters['symbol'] !== '') {
    where.symbol = { contains: filters['symbol'] };
  }
  if (typeof filters['risk_group'] === 'string') {
    where.risk_group_id = filters['risk_group'];
  }
  if (typeof filters['expired'] === 'boolean') {
    where.expired = filters['expired'];
  }
  // account_id does NOT filter which symbols appear — all symbols are always shown.
  // account_id only affects computed field calculations in the entity route.
  return where;
}
