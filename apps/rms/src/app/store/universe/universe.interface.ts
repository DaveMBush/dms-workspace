export interface Universe {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  most_recent_sell_date: string | null; // ISO date string
  symbol: string;
  ex_date: string; // ISO date string
  risk: number;
  risk_group: number;
  expired: boolean;
  name: string;
}
