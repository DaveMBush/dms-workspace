import { prisma } from '../../prisma/prisma-client';
import { SortColumn } from '../common/sort-column.interface';
import { TableState } from '../common/table-state.interface';
import { buildUniverseWhere } from './build-universe-where.function';
import { PartialArrayDefinition } from './partial-array-definition.interface';
import { sortUniversesByComputedField } from './universe-computed-sort.function';

interface ComputedSortParams {
  state: TableState;
  startIndex: number;
  length: number;
  accountId: string | null;
  computedSort: SortColumn;
}

export async function getTopUniversesComputedSort(
  params: ComputedSortParams
): Promise<PartialArrayDefinition> {
  const { state, startIndex, length, accountId, computedSort } = params;
  const select = { buy: true, quantity: true, sell: true, sell_date: true };
  const tradesSelect =
    accountId !== null ? { where: { accountId }, select } : { select };

  const universes = await prisma.universe.findMany({
    select: {
      id: true,
      distribution: true,
      distributions_per_year: true,
      last_price: true,
      trades: tradesSelect,
    },
    where: buildUniverseWhere(state),
    orderBy: { id: 'asc' },
  });
  sortUniversesByComputedField(
    universes,
    computedSort.column,
    computedSort.direction
  );
  const allIds = universes.map(function mapUniverse(universe) {
    return universe.id;
  });
  return {
    startIndex,
    indexes: allIds.slice(startIndex, startIndex + length),
    length: allIds.length,
  };
}
