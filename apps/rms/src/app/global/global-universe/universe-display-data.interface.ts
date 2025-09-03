export interface UniverseDisplayData {
  symbol: string;
  riskGroup: string;
  distribution: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  distributions_per_year: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  last_price: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_date: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_price: number | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  ex_date: Date | string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  yield_percent: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  avg_purchase_yield_percent: number;
  expired: boolean;
  position: number;
}
