import { PartialArrayDefinition, SmartArray } from '@smarttools/smart-signals';

import { DivDeposit } from '../div-deposits/div-deposit.interface';
import { Trade } from '../trades/trade.interface';

export interface Account {
  id: string;
  name: string;
  trades: string[] | Trade[];
  divDeposits: PartialArrayDefinition | SmartArray<Account, DivDeposit>;
  months: { month: number; year: number }[];
}
