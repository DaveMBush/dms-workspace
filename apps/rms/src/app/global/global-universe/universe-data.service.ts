import { Injectable } from '@angular/core';

import { selectAccountChildren } from '../../store/trades/selectors/select-account-children.function';
import type { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import type { Universe } from '../../store/universe/universe.interface';
import { compareForSort } from './compare-for-sort.function';

interface AccountSpecificData {
  position: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_date: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_price: number | null;
}

interface UniverseDisplayData {
  symbol: string;
  riskGroup: string;
  distribution: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  distributions_per_year: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  last_price: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_date: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  most_recent_sell_price: number | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  ex_date: Date | string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  yield_percent: number;
  expired: boolean;
  position: number;
}

interface FilterAndSortParams {
  rawData: UniverseDisplayData[];
  sortCriteria: Array<{field: string, order: number}>;
  minYield: number | null;
  selectedAccount: string;
  symbolFilter: string;
}

@Injectable({
  providedIn: 'root'
})
export class UniverseDataService {

  /**
   * Gets the sortable ex-date value, which may be a calculated next ex-date
   * if the current ex-date has passed
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  getSortableExDate(data: { ex_date?: unknown, distributions_per_year: number }): Date {
    if (!(data.ex_date instanceof Date)) {
      return new Date(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const exDate = new Date(data.ex_date);
    exDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // If ex-date is today or in the past, calculate the next expected ex-date
    if (exDate <= today) {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
      const distributionsPerYear = (data as { distributions_per_year: number }).distributions_per_year ?? 0;
      const nextExDate = new Date(exDate);

      if (distributionsPerYear === 12) {
        // Monthly distributions - add 1 month
        nextExDate.setMonth(nextExDate.getMonth() + 1);
      } else if (distributionsPerYear === 4) {
        // Quarterly distributions - add 3 months
        nextExDate.setMonth(nextExDate.getMonth() + 3);
      } else {
        // For other frequencies, use the original date
        return exDate;
      }

      return nextExDate;
    }

    // If ex-date is in the future, use the original date
    return exDate;
  }

  /**
   * Gets the value of a field from the display data object
   */
  getFieldValueFromDisplayData(data: UniverseDisplayData, field: string): unknown {
    switch (field) {
      case 'yield_percent':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as {yield_percent: number}).yield_percent ?? 0;
      case 'ex_date':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching destination
        return this.getSortableExDate(data as { ex_date: unknown, distributions_per_year: number });
      case 'most_recent_sell_date': {
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        const typedData = data as { most_recent_sell_date: string };
        const sellDate = typedData.most_recent_sell_date;
        return sellDate ? new Date(sellDate) : new Date(0);
      }
      case 'most_recent_sell_price':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as { most_recent_sell_price: number }).most_recent_sell_price ?? 0;
      default:
        return (data as unknown as Record<string, unknown>)[field];
    }
  }

  /**
   * Finds a universe by symbol and returns it, or null if not found
   */
  findUniverseBySymbol(symbol: string): Universe | null {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === symbol) {
        return universes[i];
      }
    }
    return null;
  }

  /**
   * Gets account-specific data for a symbol
   */
  getAccountSpecificData(symbol: string, accountId: string): AccountSpecificData {
    const universes = selectUniverses();
    let universeId: string | undefined;
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === symbol) {
        universeId = universes[i].id;
        break;
      }
    }

    const accountsState = selectAccountChildren();
    const account = accountsState.entities[accountId];

    if (!account) {
      return {
        position: 0,
        most_recent_sell_date: null,
        most_recent_sell_price: null
      };
    }

    // Find trades for this symbol in this account
    const trades = account.trades as Trade[];
    const symbolTrades: Trade[] = [];
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].universeId === universeId) {
        symbolTrades.push(trades[i]);
      }
    }

    // Calculate position (sum of buy * quantity for open positions)
    const position = symbolTrades
      .filter(function symbolTradesPositionFilter(trade: Trade) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- this is the only thing that works reliably without triggering another lint error
        return !trade.sell_date;
      }) // Only open positions
      .reduce(function symbolTradesPositionReduce(sum: number, trade: Trade) {
        return sum + (trade.buy * trade.quantity);
      }, 0);

    // Find most recent sell date and price
    const soldTrades = symbolTrades
      .filter(function filterSellDates(trade: Trade) {
        return Boolean(trade.sell_date);
      })
      .sort(function sortTrades(a: Trade, b: Trade) {
        return new Date(b.sell_date!).getTime() - new Date(a.sell_date!).getTime()
      });

    const mostRecentSell = soldTrades[0];

    return {
      position,
      most_recent_sell_date: mostRecentSell?.sell_date ?? null,
      most_recent_sell_price: mostRecentSell?.sell ?? null
    };
  }

  /**
   * Filters and sorts universe data based on criteria
   */
  filterAndSortUniverses(params: FilterAndSortParams): UniverseDisplayData[] {
    const { rawData, sortCriteria, minYield, selectedAccount, symbolFilter } = params;

    // Apply filters
    let filteredData = rawData;

    // Apply symbol filter
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredData = filteredData.filter(function filterSymbol(item: UniverseDisplayData) {
        return item.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }

    // Apply yield filter
    if (minYield !== null && minYield > 0) {
      filteredData = filteredData.filter(function filterYield(item: UniverseDisplayData) {
        return Boolean(item.yield_percent) && item.yield_percent >= minYield;
      });
    }

    // Apply account-specific filtering for position and sell data
    if (selectedAccount !== 'all') {
      const self = this;
      filteredData = filteredData.map(function mapAccountSpecificData(item: UniverseDisplayData) {
        // Get account-specific data for this symbol
        const accountSpecificData = self.getAccountSpecificData(item.symbol, selectedAccount);
        return {
          ...item,
          position: accountSpecificData.position,
          most_recent_sell_date: accountSpecificData.most_recent_sell_date,
          most_recent_sell_price: accountSpecificData.most_recent_sell_price
        };
      });
    }

    if (sortCriteria.length === 0) {
      return filteredData;
    }

    // Create a copy to avoid mutating the original data
    const sortedData = [...filteredData];

    const self = this;
    sortedData.sort(function sortData(a: UniverseDisplayData, b: UniverseDisplayData) {
      for (const criteria of sortCriteria) {
        const aValue = self.getFieldValueFromDisplayData(a, criteria.field);
        const bValue = self.getFieldValueFromDisplayData(b, criteria.field);

        const comparison = compareForSort(aValue, bValue);
        if (comparison !== 0) {
          return criteria.order * comparison;
        }
      }
      return 0;
    });

    return sortedData;
  }
}
