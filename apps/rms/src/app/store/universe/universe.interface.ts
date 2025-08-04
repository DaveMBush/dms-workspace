/* eslint-disable @typescript-eslint/naming-convention -- matching server */
export interface Universe {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  most_recent_sell_date: string | null; // ISO date string
  most_recent_sell_price: number | null;
  symbol: string;
  ex_date: string; // ISO date string
  risk_group_id: string;
  expired: boolean;
  name: string;
  position: number;
}
