import { TableState } from '../common/table-state.interface';

interface UniverseWithYieldFields {
  distribution: number;
  distributions_per_year: number;
  last_price: number;
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

function hasMinYieldFilter(state: TableState): boolean {
  return (
    state.filters !== undefined &&
    typeof state.filters['min_yield'] === 'number'
  );
}

/**
 * Applies min-yield filtering to universe records.
 * Returns the original array if no min_yield filter is active.
 * Filters by computed yield (distribution * distributions_per_year * 100 / last_price).
 */
export function applyMinYieldFilter<T extends UniverseWithYieldFields>(
  universes: T[],
  state: TableState
): T[] {
  if (!hasMinYieldFilter(state)) {
    return universes;
  }
  const minYield = state.filters!['min_yield'] as number;
  const result: T[] = [];
  for (let i = 0; i < universes.length; i++) {
    const u = universes[i];
    const yieldPct = computeYieldPercent(
      u.distribution,
      u.distributions_per_year,
      u.last_price
    );
    if (yieldPct >= minYield) {
      result.push(u);
    }
  }
  return result;
}
