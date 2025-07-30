export interface Universe {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  most_recent_sell_date: string | null;
  most_recent_sell_price: number | null;
  symbol: string;
  ex_date: string;
  risk: number;
  risk_group_id: string;
  expired: boolean;
  position: number;
}
