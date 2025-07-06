import { Trade } from "../trades/trade.interface";

export interface Account {
  id: string;
  name: string;
  trades: string[] | Trade[];
  divDeposits: string[];
}
