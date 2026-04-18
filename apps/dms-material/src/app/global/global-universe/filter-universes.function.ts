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
    // Epic 65 (Story 65.2): preserve SmartNgRX placeholder rows
    // regardless of active filters. Placeholder rows are stable stand-ins for
    // lazy-load pages not yet fetched. Filtering them out shrinks the CDK data
    // array, caps scroll-container height, and prevents triggerProxyLoad from
    // accessing positions beyond the first page — exactly the deep-scroll
    // defect described in Epic 65.
    //
    // Story 76.3: placeholder symbol changed from '' to '\u2026' (ellipsis) so
    // that client-side Symbol ascending sort does not cluster placeholder rows
    // at the top (empty string < any letter). The ellipsis sorts after all
    // ASCII letters (U+2026 > U+005A), pushing placeholders to the end.
    if (row.symbol === '\u2026') {
      return true;
    }
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
