export interface ClosedPosition {
  id: string;
  symbol: string;
  buy: number;
  buyDate: Date;
  quantity: number;
  sell: number;
  sellDate?: Date;
  daysHeld: number;
}
