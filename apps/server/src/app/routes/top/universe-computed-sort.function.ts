import { SortColumn } from '../common/sort-column.interface';
import universeHelpers from '../universe/universe-helpers';

type ComputedSortValue = number | null;

interface UniverseForComputedSort {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  trades: Array<{
    buy: number;
    quantity: number;
    sell: number;
    sell_date: Date | null;
  }>;
}

function computeYieldPercent(
  distribution: number,
  distributionsPerYear: number,
  lastPrice: number
): number {
  if (lastPrice <= 0) {
    return 0;
  }
  return (distribution * distributionsPerYear * 100) / lastPrice;
}

function computeAvgPurchaseYieldPercent(
  trades: Array<{
    buy: number;
    quantity: number;
    sell: number;
    sell_date: Date | null;
  }>,
  distribution: number,
  distributionsPerYear: number
): number {
  return universeHelpers.calculateAvgPurchaseYieldPercent(
    universeHelpers.getOpenTrades(trades),
    distribution,
    distributionsPerYear
  );
}

function computeMostRecentSellDateTimestamp(
  trades: Array<{ sell_date: Date | null }>
): number | null {
  let mostRecent: number | null = null;
  for (let i = 0; i < trades.length; i++) {
    const sd = trades[i].sell_date;
    if (sd === null) {
      continue;
    }
    const ts = sd.getTime();
    if (mostRecent === null || ts > mostRecent) {
      mostRecent = ts;
    }
  }
  return mostRecent;
}

function getComputedNumericValue(
  field: string,
  u: UniverseForComputedSort
): number {
  switch (field) {
    case 'yield_percent':
      return computeYieldPercent(
        u.distribution,
        u.distributions_per_year,
        u.last_price
      );
    case 'avg_purchase_yield_percent':
      return computeAvgPurchaseYieldPercent(
        u.trades,
        u.distribution,
        u.distributions_per_year
      );
    default:
      return 0;
  }
}

function compareValues(
  a: ComputedSortValue,
  b: ComputedSortValue,
  order: 'asc' | 'desc'
): number {
  // nulls sort last regardless of direction
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  const diff = a - b;
  return order === 'desc' ? -diff : diff;
}

function computeMostRecentSellPrice(
  trades: Array<{ sell: number; sell_date: Date | null }>
): number | null {
  let mostRecent: { sell: number; timestamp: number } | null = null;
  for (let i = 0; i < trades.length; i++) {
    const sd = trades[i].sell_date;
    if (sd === null) {
      continue;
    }
    const ts = sd.getTime();
    if (mostRecent === null || ts > mostRecent.timestamp) {
      mostRecent = { sell: trades[i].sell, timestamp: ts };
    }
  }
  return mostRecent?.sell ?? null;
}

function getComputedValue(
  field: string,
  u: UniverseForComputedSort
): ComputedSortValue {
  if (field === 'most_recent_sell_date') {
    return computeMostRecentSellDateTimestamp(u.trades);
  }
  if (field === 'most_recent_sell_price') {
    return computeMostRecentSellPrice(u.trades);
  }
  return getComputedNumericValue(field, u);
}

export function sortUniversesByComputedField(
  universes: UniverseForComputedSort[],
  sortColumns: SortColumn[]
): void {
  const cache = new Map<string, Record<string, ComputedSortValue>>();
  for (let i = 0; i < universes.length; i++) {
    const u = universes[i];
    const values: Record<string, ComputedSortValue> = {};
    for (let j = 0; j < sortColumns.length; j++) {
      const col = sortColumns[j].column;
      values[col] = getComputedValue(col, u);
    }
    cache.set(u.id, values);
  }
  universes.sort(function sortByComputed(a, b) {
    for (let i = 0; i < sortColumns.length; i++) {
      const col = sortColumns[i].column;
      const result = compareValues(
        cache.get(a.id)![col],
        cache.get(b.id)![col],
        sortColumns[i].direction
      );
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
}
