export interface OpenPosition {
  id: string;
  symbol: string;
  exDate: string;
  buy: number;
  buyDate: Date;
  quantity: number;
  expectedYield: number;
  sell: number;
  sellDate?: Date;
  daysHeld: number;
  targetGain: number;
  targetSell: number;
  lastPrice: number;
  unrealizedGainPercent: number;
  unrealizedGain: number;
  [key: string]: unknown;
}
