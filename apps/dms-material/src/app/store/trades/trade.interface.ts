/* eslint-disable @typescript-eslint/naming-convention -- matching server */
export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol?: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}
