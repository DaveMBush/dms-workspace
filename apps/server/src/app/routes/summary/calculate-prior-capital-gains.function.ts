import { AccountWithTradesAndDeposits } from './account-with-trades-and-deposits.interface';
import { aggregateAccountData } from './aggregate-account-data.function';

export function calculatePriorCapitalGains(
  accounts: AccountWithTradesAndDeposits[]
): number {
  const aggregatedData = aggregateAccountData(accounts);
  return aggregatedData.capitalGains;
}
