import { MappedDivDeposit } from './mapped-div-deposit.interface';
import { MappedSale } from './mapped-sale.interface';
import { MappedTrade } from './mapped-trade.interface';
import { UnknownTransaction } from './unknown-transaction.interface';

export interface MappedTransactionResult {
  trades: MappedTrade[];
  sales: MappedSale[];
  divDeposits: MappedDivDeposit[];
  unknownTransactions: UnknownTransaction[];
}
