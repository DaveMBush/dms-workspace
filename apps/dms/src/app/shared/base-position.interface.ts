export interface BasePosition {
  id: string;
  symbol: string;
  buy: number;
  buyDate: Date | string;
  quantity: number;
  sell: number;
  sellDate?: Date | string | null;
  [key: string]: unknown;
}
