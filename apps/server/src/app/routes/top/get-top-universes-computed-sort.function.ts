import { prisma } from '../../prisma/prisma-client';
import { SortColumn } from '../common/sort-column.interface';
import { TableState } from '../common/table-state.interface';
import { buildUniverseWhere } from './build-universe-where.function';
import { PartialArrayDefinition } from './partial-array-definition.interface';
import { sortUniversesByComputedField } from './universe-computed-sort.function';

interface ComputedSortParams {
  state: TableState;
  startIndex: number;
  length?: number;
  accountId: string | null;
  computedSort: SortColumn;
}

export async function getTopUniversesComputedSort(
  params: ComputedSortParams
): Promise<PartialArrayDefinition> {
  const { state, accountId, computedSort } = params;
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
    distinct: ['id'],
    where: buildUniverseWhere(state),
    orderBy: { id: 'asc' },
  });
  const sortColumnsToApply: SortColumn[] =
    state.sortColumns !== undefined && state.sortColumns.length > 0
      ? state.sortColumns
      : [{ column: computedSort.column, direction: computedSort.direction }];
  sortUniversesByComputedField(universes, sortColumnsToApply);
  const allIds = universes.map(function mapUniverse(universe) {
    return universe.id;
  });
  // For computed sorts we must return ALL sorted IDs so SmartNgRX can replace
  // every position in its array proxy.  Returning only a page-sized slice
  // leaves stale IDs at positions beyond the page boundary, causing duplicate
  // rows to appear when the virtual-scroll buffer pre-loads those positions.
  return {
    startIndex: 0,
    indexes: allIds,
    length: allIds.length,
  };
}
