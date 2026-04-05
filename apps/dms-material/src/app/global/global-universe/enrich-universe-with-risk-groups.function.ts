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

  const result = new Array<EnrichedUniverse>(totalLength);

  for (let i = 0; i < totalLength; i++) {
    const id = isProxy ? smartArr.getIdAtIndex!(i) : 'loaded';
    if (id === undefined || id.startsWith('index')) {
      result[i] = buildPlaceholderUniverseEntry(
        id ?? `placeholder-${String(i)}`
      );
      continue;
    }
    const universe = universes[i];
    if (typeof universe === 'string') {
      result[i] = buildPlaceholderUniverseEntry(universe);
      continue;
    }
    result[i] = buildFullUniverseEntry(universe, riskGroupMap);
  }

  return result;
}
