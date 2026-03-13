import type { RiskGroups } from './risk-groups.types';
import type { UniverseRecord } from './universe-record.types';

export function createUniverseRecords(
  symbols: string[],
  riskGroups: RiskGroups,
  prices: [number, number, number],
  exDates: [Date, Date, Date]
): UniverseRecord[] {
  const eq = riskGroups.equitiesRiskGroup.id;
  const inc = riskGroups.incomeRiskGroup.id;
  return [
    {
      symbol: symbols[0],
      risk_group_id: eq,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: prices[0],
      ex_date: exDates[0],
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[1],
      risk_group_id: inc,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: prices[1],
      ex_date: exDates[1],
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
    {
      symbol: symbols[2],
      risk_group_id: eq,
      distribution: 1.0,
      distributions_per_year: 4,
      last_price: prices[2],
      ex_date: exDates[2],
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      expired: false,
      is_closed_end_fund: true,
    },
  ];
}
