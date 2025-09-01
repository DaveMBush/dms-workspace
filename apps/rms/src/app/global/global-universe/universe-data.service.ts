import { Injectable } from '@angular/core';

import type { Account } from '../../store/accounts/account.interface';
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
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
  avg_purchase_yield_percent: number;
  expired: boolean;
  position: number;
}

interface FilterAndSortParams {
  rawData: UniverseDisplayData[];
  sortCriteria: Array<{ field: string; order: number }>;
  minYield: number | null;
  selectedAccount: string;
  symbolFilter: string;
  riskGroupFilter: string | null;
  expiredFilter: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class UniverseDataService {
  /**
   * Gets the sortable ex-date value, which may be a calculated next ex-date
   * if the current ex-date has passed
   */
  getSortableExDate(data: {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
    ex_date?: unknown;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
    distributions_per_year: number;
  }): Date {
    if (!(data.ex_date instanceof Date)) {
      return new Date(0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const exDate = new Date(data.ex_date);
    exDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // If ex-date is today or in the past, calculate the next expected ex-date
    if (exDate <= today) {
      const distributionsPerYear =
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        (data as { distributions_per_year: number }).distributions_per_year ??
        0;
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
  getFieldValueFromDisplayData(
    data: UniverseDisplayData,
    field: string
  ): unknown {
    switch (field) {
      case 'yield_percent':
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        return (data as { yield_percent: number }).yield_percent ?? 0;
      case 'avg_purchase_yield_percent':
        return (
          // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
          (data as { avg_purchase_yield_percent: number })
            .avg_purchase_yield_percent ?? 0
        );
      case 'ex_date':
        return this.getSortableExDate(
          // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
          data as { ex_date: unknown; distributions_per_year: number }
        );
      case 'most_recent_sell_date': {
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
        const typedData = data as { most_recent_sell_date: string };
        const sellDate = typedData.most_recent_sell_date;
        return sellDate ? new Date(sellDate) : new Date(0);
      }
      case 'most_recent_sell_price':
        return (
          // eslint-disable-next-line @typescript-eslint/naming-convention -- matching source
          (data as { most_recent_sell_price: number }).most_recent_sell_price ??
          0
        );
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
  getAccountSpecificData(
    symbol: string,
    accountId: string
  ): AccountSpecificData {
    const universeId = this.findUniverseIdBySymbol(symbol);
    const account = this.getAccountFromState(accountId);

    if (account === null || account === undefined) {
      return this.createEmptyAccountData();
    }

    const symbolTrades = this.getTradesForUniverse(
      (account as Account).trades as Trade[],
      universeId
    );
    const position = this.calculatePosition(symbolTrades);
    const mostRecentSell = this.getMostRecentSell(symbolTrades);

    return {
      position,
      most_recent_sell_date: mostRecentSell?.sell_date ?? null,
      most_recent_sell_price: mostRecentSell?.sell ?? null,
    };
  }

  /**
   * Applies filters to universe data
   */
  applyFilters(
    data: UniverseDisplayData[],
    params: FilterAndSortParams
  ): UniverseDisplayData[] {
    let filteredData = data;

    filteredData = this.applySymbolFilter(filteredData, params.symbolFilter);
    filteredData = this.applyYieldFilter(filteredData, params.minYield);
    filteredData = this.applyRiskGroupFilter(
      filteredData,
      params.riskGroupFilter
    );
    filteredData = this.applyExpiredFilter(filteredData, params.expiredFilter);
    filteredData = this.applyAccountSpecificFilter(
      filteredData,
      params.selectedAccount
    );

    return filteredData;
  }

  /**
   * Filters and sorts universe data based on criteria
   */
  filterAndSortUniverses(params: FilterAndSortParams): UniverseDisplayData[] {
    const { rawData, sortCriteria } = params;

    // Apply filters
    const filteredData = this.applyFilters(rawData, params);

    if (sortCriteria.length === 0) {
      return filteredData;
    }

    // Create a copy to avoid mutating the original data
    const sortedData = [...filteredData];

    const self = this;
    sortedData.sort(function sortData(
      a: UniverseDisplayData,
      b: UniverseDisplayData
    ) {
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

  private findUniverseIdBySymbol(symbol: string): string | undefined {
    const universes = selectUniverses();
    for (let i = 0; i < universes.length; i++) {
      if (universes[i].symbol === symbol) {
        return universes[i].id;
      }
    }
    return undefined;
  }

  private getAccountFromState(accountId: string): unknown {
    const accountsState = selectAccountChildren();
    return accountsState.entities[accountId];
  }

  private createEmptyAccountData(): AccountSpecificData {
    return {
      position: 0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
    };
  }

  private getTradesForUniverse(
    trades: Trade[],
    universeId: string | undefined
  ): Trade[] {
    const symbolTrades: Trade[] = [];
    for (let i = 0; i < trades.length; i++) {
      if (trades[i].universeId === universeId) {
        symbolTrades.push(trades[i]);
      }
    }
    return symbolTrades;
  }

  private calculatePosition(symbolTrades: Trade[]): number {
    return symbolTrades
      .filter(function symbolTradesPositionFilter(trade: Trade) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- this is the only thing that works reliably without triggering another lint error
        return !trade.sell_date;
      }) // Only open positions
      .reduce(function symbolTradesPositionReduce(sum: number, trade: Trade) {
        return sum + trade.buy * trade.quantity;
      }, 0);
  }

  private getMostRecentSell(symbolTrades: Trade[]): Trade | undefined {
    const soldTrades = symbolTrades
      .filter(function filterSellDates(trade: Trade) {
        return Boolean(trade.sell_date);
      })
      .sort(function sortTrades(a: Trade, b: Trade) {
        return (
          new Date(b.sell_date!).getTime() - new Date(a.sell_date!).getTime()
        );
      });

    return soldTrades[0];
  }

  private applySymbolFilter(
    data: UniverseDisplayData[],
    symbolFilter: string
  ): UniverseDisplayData[] {
    if (symbolFilter && symbolFilter.trim() !== '') {
      return data.filter(function filterSymbol(item: UniverseDisplayData) {
        return item.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      });
    }
    return data;
  }

  private applyYieldFilter(
    data: UniverseDisplayData[],
    minYield: number | null
  ): UniverseDisplayData[] {
    if (minYield !== null && minYield > 0) {
      return data.filter(function filterYield(item: UniverseDisplayData) {
        return Boolean(item.yield_percent) && item.yield_percent >= minYield;
      });
    }
    return data;
  }

  private applyRiskGroupFilter(
    data: UniverseDisplayData[],
    riskGroupFilter: string | null
  ): UniverseDisplayData[] {
    if (riskGroupFilter !== null && riskGroupFilter.trim() !== '') {
      return data.filter(function filterRiskGroup(item: UniverseDisplayData) {
        return item.riskGroup === riskGroupFilter;
      });
    }
    return data;
  }

  private applyExpiredFilter(
    data: UniverseDisplayData[],
    expiredFilter: boolean | null
  ): UniverseDisplayData[] {
    if (expiredFilter !== null) {
      return data.filter(function filterExpired(item: UniverseDisplayData) {
        return item.expired === expiredFilter;
      });
    }
    return data;
  }

  private applyAccountSpecificFilter(
    data: UniverseDisplayData[],
    selectedAccount: string
  ): UniverseDisplayData[] {
    if (selectedAccount !== 'all') {
      const self = this;
      return data.map(function mapAccountSpecificData(
        item: UniverseDisplayData
      ) {
        const accountSpecificData = self.getAccountSpecificData(
          item.symbol,
          selectedAccount
        );
        return {
          ...item,
          position: accountSpecificData.position,
          most_recent_sell_date: accountSpecificData.most_recent_sell_date,
          most_recent_sell_price: accountSpecificData.most_recent_sell_price,
        };
      });
    }
    return data;
  }
}
