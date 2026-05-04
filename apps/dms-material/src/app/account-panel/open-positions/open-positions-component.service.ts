import { computed, inject, Injectable, signal } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';

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
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    const trades = currentAccount().openTrades as Trade[];
    const tradesArray = trades as SmartArray<Account, Trade> & Trade[];
    for (let i = 0; i < tradesArray.length; i++) {
      const trade = tradesArray[i] as RowProxyDelete & Trade;
      if (trade.id === position.id) {
        trade.delete!();
        break;
      }
    }
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
    // Story 95.2: Use safe defaults for Universe fields not available on Trade
    // A follow-up story will extend the Trade interface with these fields
    const lastPrice = 0; // Universe.last_price not available on Trade
    const distribution = 0; // Universe.distribution not available on Trade
    const exDate = null; // Universe.ex_date not available on Trade

    const daysHeld = this.differenceInTradingDaysPrivate(
      trade.buy_date,
      new Date().toISOString()
    );
    const expectedYield = distribution ? trade.quantity * distribution : 0;
    const targetGain = 0; // Requires distribution and ex_date calculations

    const sellDate =
      trade.sell_date !== undefined
        ? this.parseDateString(trade.sell_date)
        : undefined;
    return {
      id: trade.id,
      symbol: trade.symbol, // Story 95.2: Use trade.symbol directly
      exDate,
      buy: trade.buy,
      buyDate: this.parseDateString(trade.buy_date),
      sell: trade.sell,
      sellDate,
      daysHeld,
      expectedYield,
      targetGain,
      targetSell:
        trade.quantity > 0
          ? targetGain / trade.quantity + trade.buy
          : trade.buy,
      quantity: trade.quantity,
      lastPrice,
      unrealizedGainPercent:
        lastPrice > 0 && trade.buy > 0
          ? ((lastPrice - trade.buy) / trade.buy) * 100
          : 0,
      unrealizedGain:
        lastPrice > 0 ? (lastPrice - trade.buy) * trade.quantity : 0,
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
