import { PartialArrayDefinition, SmartArray } from '@smarttools/smart-signals';

import { DivDeposit } from '../div-deposits/div-deposit.interface';
import { Trade } from '../trades/trade.interface';

export interface Account {
  id: string;
  name: string;
  openTrades: PartialArrayDefinition | SmartArray<Account, Trade>;
  soldTrades: PartialArrayDefinition | SmartArray<Account, Trade>;
  divDeposits: PartialArrayDefinition | SmartArray<Account, DivDeposit>;
  months: { month: number; year: number }[];
}
