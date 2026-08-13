export interface UniverseRecord {
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  ex_date: Date | null;
  most_recent_sell_date: Date | null;
  most_recent_sell_price: number | null;
  expired: boolean;
  is_closed_end_fund: boolean;
}
