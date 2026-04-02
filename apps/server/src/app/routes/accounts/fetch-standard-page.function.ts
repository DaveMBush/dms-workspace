import { prisma } from '../../prisma/prisma-client';
import { PartialArrayDefinition } from '../top/partial-array-definition.interface';
import { ACCOUNT_PAGE_SIZE } from './account-page-size.const';

type PrismaCountFn = (args: { where: unknown }) => Promise<number>;
type PrismaFindManyFn = (args: {
  where: unknown;
  select: { id: boolean };
  orderBy: unknown;
  skip: number;
  take: number;
}) => Promise<Array<{ id: string }>>;

/**
 * Generic page fetcher for standard (non-computed-sort) table queries.
 * Replaces the duplicated getSoldTradesPage / getDivDepositsPage pattern.
 */
export async function fetchStandardPage(
  modelName: 'divDeposits' | 'trades',
  where: unknown,
  orderBy: unknown
): Promise<PartialArrayDefinition> {
  const model = prisma[modelName] as unknown as {
    count: PrismaCountFn;
    findMany: PrismaFindManyFn;
  };
  const [totalCount, items] = await Promise.all([
    model.count({ where }),
    model.findMany({
      where,
      select: { id: true },
      orderBy,
      skip: 0,
      take: ACCOUNT_PAGE_SIZE,
    }),
  ]);
  return {
    startIndex: 0,
    indexes: items.map(function mapId(item) {
      return item.id;
    }),
    length: totalCount,
  };
}
