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
    // Epic 65 (Story 65.2): preserve SmartNgRX placeholder rows (symbol === '')
    // regardless of active filters. Placeholder rows are stable stand-ins for
    // lazy-load pages not yet fetched. Filtering them out shrinks the CDK data
    // array, caps scroll-container height, and prevents triggerProxyLoad from
    // accessing positions beyond the first page — exactly the deep-scroll
    // defect described in Epic 65.
    //
    // Deep-scroll lazy-load fix history:
    // - Epics 29, 31, 44: CDK rowHeight mismatch, contain: strict, CSS transitions
    // - Epic 60 (Story 60.2): isLoading→null return caused array shrink; replaced
    //   with placeholder return to keep array length stable
    // - Epic 64 (Story 64.2): terminal excludeLoadingRows filter in filteredData$
    //   was removed so CDK sees all placeholder rows during fast scroll
    // - Epic 65 (Story 65.2): riskGroupFilter / expiredFilter / minYieldFilter
    //   were still stripping placeholder rows when active, re-introducing the
    //   deep-scroll height-cap defect for filtered views. Fix: pass placeholder
    //   rows through unconditionally; real data will replace them once loaded.
    if (row.symbol === '') {
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
