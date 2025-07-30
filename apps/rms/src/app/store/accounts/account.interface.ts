import { DivDeposit } from "../div-deposits/div-deposit.interface";
import { Trade } from "../trades/trade.interface";

export interface Account {
  id: string;
  name: string;
  trades: string[] | Trade[];
  divDeposits: DivDeposit[] | string[];
  months: {month: number, year: number}[];
}
