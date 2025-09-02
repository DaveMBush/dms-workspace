import { Injectable } from '@angular/core';

import type { Account } from '../../store/accounts/account.interface';
import { selectAccountChildren } from '../../store/trades/selectors/select-account-children.function';
import type { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import type { Universe } from '../../store/universe/universe.interface';
import { calculateTradeTotals } from './account-data-calculator.function';
import { applyAllAccountsFilter } from './apply-all-accounts-filter.function';
import { applyExpiredFilter } from './apply-expired-filter.function';
import { applyExpiredWithPositionsFilter } from './apply-expired-with-positions-filter.function';
import { applyRiskGroupFilter } from './apply-risk-group-filter.function';
import { applySpecificAccountFilter } from './apply-specific-account-filter.function';
import { applySymbolFilter } from './apply-symbol-filter.function';
import { applyYieldFilter } from './apply-yield-filter.function';
import { compareForSort } from './compare-for-sort.function';
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
    const avgPurchaseYieldPercent = this.calculateAveragePurchaseYield(
      symbol,
      accountId
    );

    return {
      position,
      most_recent_sell_date: mostRecentSell?.sell_date ?? null,
      most_recent_sell_price: mostRecentSell?.sell ?? null,
      avg_purchase_yield_percent: avgPurchaseYieldPercent,
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

    filteredData = applySymbolFilter(filteredData, params.symbolFilter);
    filteredData = applyYieldFilter(filteredData, params.minYield);
    filteredData = applyRiskGroupFilter(filteredData, params.riskGroupFilter);
    filteredData = applyExpiredFilter(filteredData, params.expiredFilter);

    filteredData = this.applyAccountSpecificFilter(
      filteredData,
      params.selectedAccount
    );

    // Apply expired-with-positions filter AFTER account-specific filtering
    // so that position field is correctly set for the selected account
    filteredData = applyExpiredWithPositionsFilter(
      filteredData,
      params.expiredFilter,
      params.selectedAccount,
      this.hasPositionsInAnyAccount.bind(this)
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
      avg_purchase_yield_percent: 0,
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

  /**
   * Calculates the average purchase yield percentage for a symbol
   * based on open positions in the specified account or all accounts
   */
  private calculateAveragePurchaseYield(
    symbol: string,
    selectedAccount: string
  ): number {
    const universe = this.findUniverseBySymbol(symbol);
    if (!universe || universe.distribution <= 0) {
      return 0;
    }

    const { totalCost, totalQuantity } = calculateTradeTotals(
      universe.id,
      selectedAccount
    );

    const avgPurchasePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    const avgPurchaseYieldPercent =
      avgPurchasePrice > 0 && universe.distribution > 0
        ? 100 *
          universe.distributions_per_year *
          (universe.distribution / avgPurchasePrice)
        : 0;

    return avgPurchaseYieldPercent;
  }

  private applyAccountSpecificFilter(
    data: UniverseDisplayData[],
    selectedAccount: string
  ): UniverseDisplayData[] {
    if (selectedAccount !== 'all') {
      return applySpecificAccountFilter(
        data,
        selectedAccount,
        this.getAccountSpecificData.bind(this)
      );
    }

    return applyAllAccountsFilter(
      data,
      this.calculateAveragePurchaseYield.bind(this)
    );
  }

  /**
   * Checks if a symbol has positions in any account
   * Used for expired-with-positions filtering when selectedAccount = "all"
   */
  private hasPositionsInAnyAccount(symbol: string): boolean {
    const universeId = this.findUniverseIdBySymbol(symbol);
    if (universeId === undefined || universeId === null) {
      return false;
    }

    const accountsState = selectAccountChildren();
    const accounts = Object.values(accountsState.entities);

    const self = this;
    return accounts.some(function hasPositionsInAccountCheck(account: unknown) {
      if (
        account === null ||
        account === undefined ||
        typeof account !== 'object'
      ) {
        return false;
      }

      // The account object has both Account interface properties and an 'account' field
      const accountWithId = account as Account & { account: string };
      const accountId: string = accountWithId.account;
      const accountSpecificData = self.getAccountSpecificData(
        symbol,
        accountId
      );
      return accountSpecificData.position > 0;
    });
  }
}
