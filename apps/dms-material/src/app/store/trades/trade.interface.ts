/* eslint-disable @typescript-eslint/naming-convention -- matching server */
export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
  expected_dollars: number;
  last_dollars_unrealized_gain_percent: number;
  unrealized_gain_dollars: number;
  target_gain: number;
  target_sell: number;
  last_price: number;
}
