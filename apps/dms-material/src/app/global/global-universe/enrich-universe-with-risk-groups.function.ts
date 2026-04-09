import { SmartNgRXRowBase } from '@smarttools/smart-signals';

import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { Universe } from '../../store/universe/universe.interface';
import { EnrichedUniverse } from './enriched-universe.interface';

function buildRiskGroupMap(riskGroups: RiskGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  if (
    riskGroups === null ||
    riskGroups === undefined ||
    riskGroups.length === 0
  ) {
    return map;
  }
  for (let i = 0; i < riskGroups.length; i++) {
    map.set(riskGroups[i].id, riskGroups[i].name);
  }
  return map;
}

function buildPlaceholderUniverseEntry(id: string): EnrichedUniverse {
  return {
    id,
    symbol: '',
    distribution: 0,
    distributions_per_year: 0,
    last_price: 0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: '',
    risk_group_id: '',
    risk_group: '',
    expired: false,
    is_closed_end_fund: false,
    name: '',
    position: 0,
    avg_purchase_yield_percent: 0,
  };
}

function buildFullUniverseEntry(
  universe: Universe,
  riskGroupMap: Map<string, string>
): EnrichedUniverse {
  return {
    id: universe.id,
    symbol: universe.symbol,
    distribution: universe.distribution,
    distributions_per_year: universe.distributions_per_year,
    last_price: universe.last_price,
    most_recent_sell_date: universe.most_recent_sell_date,
    most_recent_sell_price: universe.most_recent_sell_price,
    ex_date: universe.ex_date,
    risk_group_id: universe.risk_group_id,
    risk_group:
      riskGroupMap.get(universe.risk_group_id) ?? universe.risk_group_id,
    expired: universe.expired,
    is_closed_end_fund: universe.is_closed_end_fund,
    name: universe.name,
    position: universe.position,
    avg_purchase_yield_percent: universe.avg_purchase_yield_percent,
  };
}

// Access proxy items in the visible range to trigger SmartNgRX lazy loading.
// bufferIndexes() batches all synchronous proxy accesses into ONE network request.
function triggerProxyLoad(
  universes: Universe[],
  visibleRange: { start: number; end: number }
): void {
  const buffer = 20;
  const visEnd = Math.min(universes.length, visibleRange.end + buffer);
  for (let i = Math.max(0, visibleRange.start - buffer); i < visEnd; i++) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- intentional proxy access
    universes[i];
  }
}

export function enrichUniverseWithRiskGroups(
  universes: Universe[],
  riskGroups: RiskGroup[],
  visibleRange?: { start: number; end: number }
): EnrichedUniverse[] {
  const riskGroupMap = buildRiskGroupMap(riskGroups);
  const totalLength = universes.length;
  if (totalLength === 0) {
    return [] as EnrichedUniverse[];
  }

  const smartArr = universes as unknown as {
    getIdAtIndex?(i: number): string | undefined;
  };
  const isProxy = typeof smartArr.getIdAtIndex === 'function';

  if (visibleRange !== undefined && isProxy) {
    triggerProxyLoad(universes, visibleRange);
  }

  const result: EnrichedUniverse[] = [];

  for (let i = 0; i < totalLength; i++) {
    const id = isProxy ? smartArr.getIdAtIndex!(i) : 'loaded';
    const entry = buildEnrichedEntry(id, i, universes[i], riskGroupMap);
    result.push(entry);
  }

  return result;
}

// Builds the EnrichedUniverse entry for a single loop iteration.
// Returns a placeholder for SmartNgRX loading rows so the data array
// length stays stable during in-flight API calls.
//
// Fix: return placeholder instead of null for isLoading rows — resolves CDK
// virtual scroll blank rows during rapid scroll (Epics 29, 31, 44, and 60).
// Root cause: returning null shrinks the data array passed to CdkVirtualScrollViewport.
// A smaller array → recalculated (shorter) total scroll height → viewport
// position jump → blank rows at the new scroll position.
// Story 56.2 introduced the null-return to prevent empty symbols clustering at
// the top on client-side symbol sort. That fix is preserved here by using a
// placeholder with the row's resolved id (not an empty string), which keeps the
// array length stable while still holding a unique key. When SmartNgRX finishes
// loading the row, Angular re-renders the placeholder with real data.
// See Story 60.1 Dev Agent Record for full investigation details.
function buildEnrichedEntry(
  id: string | undefined,
  index: number,
  universe: Universe | string,
  riskGroupMap: Map<string, string>
): EnrichedUniverse {
  if (id === undefined || id.startsWith('index')) {
    return buildPlaceholderUniverseEntry(id ?? `placeholder-${String(index)}`);
  }
  if (typeof universe === 'string') {
    return buildPlaceholderUniverseEntry(universe);
  }
  // Return placeholder (not null) for rows SmartNgRX is still fetching.
  // Using the row's real id prevents client-side sort from clustering loading
  // rows at the top (empty symbol < any letter) — the id is a UUID that sorts
  // to the end of the alphabet range, away from real symbols like 'AAPL'.
  // This issue has recurred in Epics 29, 31, 44, and 60.
  if ((universe as unknown as SmartNgRXRowBase).isLoading === true) {
    return buildPlaceholderUniverseEntry(id);
  }
  return buildFullUniverseEntry(universe, riskGroupMap);
}
