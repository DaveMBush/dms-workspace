import { Universe } from '../../store/universe/universe.interface';

interface FilterCriteria {
  symbolFilter: string;
  riskGroupFilter: string | null;
  expiredFilter: boolean | null;
  minYieldFilter: number | null;
}

function calculateYieldPercent(row: Universe): number {
  if (!row.last_price || row.last_price === 0) {
    return 0;
  }
  return (row.distribution * row.distributions_per_year * 100) / row.last_price;
}

export function filterUniverses(
  data: Universe[],
  criteria: FilterCriteria
): Universe[] {
  const symbolFilter = criteria.symbolFilter.toLowerCase();
  const { riskGroupFilter, expiredFilter, minYieldFilter } = criteria;

  return data.filter(function filterRow(row) {
    if (
      symbolFilter.length > 0 &&
      !row.symbol.toLowerCase().includes(symbolFilter)
    ) {
      return false;
    }
    if (riskGroupFilter !== null && row.risk_group_id !== riskGroupFilter) {
      return false;
    }
    if (expiredFilter !== null && row.expired !== expiredFilter) {
      return false;
    }
    if (minYieldFilter !== null) {
      const yieldPercent = calculateYieldPercent(row);
      if (yieldPercent < minYieldFilter) {
        return false;
      }
    }
    return true;
  });
}
