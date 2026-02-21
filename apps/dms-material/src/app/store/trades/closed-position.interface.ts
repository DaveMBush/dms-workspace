/* eslint-disable @typescript-eslint/naming-convention -- matching server snake_case */
export interface ClosedPosition {
  id: string;
  symbol: string;
  buy: number;
  buy_date: string;
  quantity: number;
  sell: number;
  sell_date?: string;
  daysHeld: number;
  capitalGain: number;
  capitalGainPercentage: number;
}
