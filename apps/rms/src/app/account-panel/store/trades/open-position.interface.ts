export interface OpenPosition {
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
}
