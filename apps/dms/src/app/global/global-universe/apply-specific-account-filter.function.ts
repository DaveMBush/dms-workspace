import type { UniverseDisplayData } from './universe-display-data.interface';

interface AccountSpecificData {
  position: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_date: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_price: number | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  avg_purchase_yield_percent: number;
}

type GetAccountSpecificDataFn = (
  symbol: string,
  accountId: string
) => AccountSpecificData;

/**
 * Applies filtering for a specific account
 */
export function applySpecificAccountFilter(
  data: UniverseDisplayData[],
  selectedAccount: string,
  getAccountSpecificData: GetAccountSpecificDataFn
): UniverseDisplayData[] {
  return data.map(function mapAccountSpecificData(item: UniverseDisplayData) {
    const accountSpecificData = getAccountSpecificData(
      item.symbol,
      selectedAccount
    );
    return {
      ...item,
      position: accountSpecificData.position,
      most_recent_sell_date: accountSpecificData.most_recent_sell_date,
      most_recent_sell_price: accountSpecificData.most_recent_sell_price,
      avg_purchase_yield_percent:
        accountSpecificData.avg_purchase_yield_percent,
    };
  });
}
