import { computed, inject, Injectable, signal } from '@angular/core';
import { castTo, facadeRegistry, FacadeBase } from '@smarttools/smart-core';
import { PartialArrayDefinition } from '@smarttools/smart-signals';

import { Account } from '../../store/accounts/account.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';

/**
 * Scrolling regression history (Epics 29, 31, 44, 60, 64, 87):
 * See base-table.component.ts for full history.
 * Story 87.2 fix: placeholder symbol changed from '' to '\u2026' so that
 * SmartNgRX in-flight loading rows are visually distinct (ellipsis) rather
 * than blank, matching the Universe screen pattern from Story 76.3.
 * A blank symbol causes the blank-cell regression guard in
 * scrolling-regression-87.spec.ts to fail.
 */
function placeholderOpenPosition(id: string): OpenPosition {
  return {
    id,
    symbol: '\u2026',
    exDate: null,
    buy: 0,
    buyDate: new Date(),
    sell: 0,
    sellDate: undefined,
    daysHeld: 0,
    expectedYield: 0,
    targetGain: 0,
    targetSell: 0,
    quantity: 0,
    lastPrice: 0,
    unrealizedGainPercent: 0,
    unrealizedGain: 0,
    isLoading: true,
  };
}

@Injectable({ providedIn: 'root' })
export class OpenPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private currentAccount = selectCurrentAccountSignal(
    this.currentAccountSignalStore
  );

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  trades = computed(() => {
    return this.currentAccount().openTrades as Trade[];
  });

  deleteOpenPosition(position: OpenPosition): void {
    // Use facadeRegistry to directly update the account's openTrades in the
    // NgRX signal store, bypassing the SmartRocks removeFromStore path which
    // has a double-decrement bug in mergeVirtualArrays for single-item arrays.
    const accountsFacade = facadeRegistry.register<Account>('app', 'accounts');
    // entityState is on SignalsFacade at runtime but not declared on FacadeBase;
    // use castTo so TypeScript accepts the property access.
    const withEntityState = castTo<
      FacadeBase<Account> & {
        entityState: {
          entityMap(): Partial<
            Record<string, Account & { openTrades: PartialArrayDefinition }>
          >;
        };
      }
    >(accountsFacade);
    const entityMap = withEntityState.entityState.entityMap();

    const accountId = this.currentAccount().id;
    const rawAccount = entityMap[accountId];
    if (rawAccount == null) {
      return;
    }

    const openTrades = rawAccount.openTrades;
    const newIndexes = openTrades.indexes.filter(function isNotClosedPosition(
      id: string
    ): boolean {
      return id !== position.id;
    });
    accountsFacade.upsertRow({
      ...rawAccount,
      openTrades: {
        ...openTrades,
        indexes: newIndexes,
        length: newIndexes.length,
      },
    });
  }

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  selectOpenPositions = computed(() => {
    const trades = this.trades();

    const totalLength = trades.length;
    if (totalLength === 0) {
      return [] as OpenPosition[];
    }

    const openPositions = new Array<OpenPosition>(totalLength);

    for (let i = 0; i < totalLength; i++) {
      const trade = trades[i];
      if (trade === undefined || typeof trade === 'string') {
        openPositions[i] = placeholderOpenPosition(`placeholder-${String(i)}`);
        continue;
      }
      // Story 95.2: Use trade.symbol directly without universe map lookup
      openPositions[i] = this.transformTradeToPosition(trade);
    }

    return openPositions;
  });

  private transformTradeToPosition(trade: Trade): OpenPosition {
    const lastPrice = trade.last_price;
    const exDate = null; // Universe.ex_date not included in Trade response

    const daysHeld = this.differenceInTradingDaysPrivate(
      trade.buy_date,
      new Date().toISOString()
    );

    const sellDate =
      typeof trade.sell_date === 'string' && trade.sell_date.trim() !== ''
        ? this.parseDateString(trade.sell_date)
        : undefined;
    return {
      id: trade.id,
      symbol: trade.symbol,
      exDate,
      buy: trade.buy,
      buyDate: this.parseDateString(trade.buy_date),
      sell: trade.sell,
      sellDate,
      daysHeld,
      expectedYield: trade.expected_dollars ?? 0,
      targetGain: trade.target_gain ?? 0,
      targetSell: trade.target_sell,
      quantity: trade.quantity,
      lastPrice,
      unrealizedGainPercent: trade.last_dollars_unrealized_gain_percent ?? 0,
      unrealizedGain: trade.unrealized_gain_dollars ?? 0,
    };
  }

  private differenceInTradingDaysPrivate(start: string, end: string): number {
    return differenceInTradingDays(start, end);
  }

  /**
   * Parse a date string (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss.sssZ, or MM/DD/YYYY) and create a Date at local midnight.
   * This avoids timezone offset issues where UTC dates become the previous day in local time.
   * Delegates to format-specific helpers to keep each branch simple.
   */
  private parseDateString(dateStr: string | null | undefined): Date {
    if (dateStr === null || dateStr === undefined || dateStr.trim() === '') {
      return new Date();
    }
    const trimmed = dateStr.trim();
    return (
      this.parseIsoDate(trimmed) ??
      this.parseMdyDate(trimmed) ??
      this.parseFallbackDate(trimmed)
    );
  }

  private parseIsoDate(trimmed: string): Date | null {
    if (!trimmed.includes('-')) {
      return null;
    }
    const datePart = trimmed.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private parseMdyDate(trimmed: string): Date | null {
    if (!trimmed.includes('/')) {
      return null;
    }
    const [month, day, year] = trimmed.split('/').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private parseFallbackDate(trimmed: string): Date {
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      return new Date(
        fallback.getFullYear(),
        fallback.getMonth(),
        fallback.getDate()
      );
    }
    return new Date();
  }
}
