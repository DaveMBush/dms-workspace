export interface UniverseRecord {
  id: string;
  symbol: string;
  risk_group_id: string;
  distribution: number;
  distributions_per_year: number;
  ex_date: Date | null;
  last_price: number;
  expired: boolean;
  is_closed_end_fund: boolean;
  createdAt: Date;
  updatedAt: Date;
}
