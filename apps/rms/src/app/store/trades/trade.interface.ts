export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}
