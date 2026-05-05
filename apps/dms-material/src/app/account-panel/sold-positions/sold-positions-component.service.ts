import { computed, inject, Injectable, signal } from '@angular/core';

import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Trade } from '../../store/trades/trade.interface';
import { classifyCapitalGain } from './classify-capital-gain.function';

/**
 * Scrolling regression history (Epics 29, 31, 44, 60, 64, 87):
 * See base-table.component.ts for full history.
 * Story 87.2 fix: placeholder symbol changed from '' to '\u2026' so that
 * SmartNgRX in-flight loading rows are visually distinct (ellipsis) rather
 * than blank, matching the Universe screen pattern from Story 76.3.
 * A blank symbol causes the blank-cell regression guard in
 * scrolling-regression-87.spec.ts to fail.
 */
function buildPlaceholderClosedPosition(id: string): ClosedPosition {
  return {
    id,
    symbol: '\u2026',
    buy: 0,
    buy_date: '',
    quantity: 0,
    sell: 0,
    sell_date: undefined,
    daysHeld: 0,
    capitalGain: 0,
    capitalGainPercentage: 0,
    isLoading: true,
  };
}

function buildFullClosedPosition(trade: Trade): ClosedPosition {
  const capitalGain = (trade.sell - trade.buy) * trade.quantity;
  const capitalGainPercentage =
    trade.buy !== 0 ? ((trade.sell - trade.buy) / trade.buy) * 100 : 0;
  return {
    id: trade.id,
    symbol: trade.symbol,
    buy: trade.buy,
    buy_date: trade.buy_date,
    quantity: trade.quantity,
    sell: trade.sell,
    sell_date: trade.sell_date,
    daysHeld:
      trade.sell_date !== undefined
        ? differenceInTradingDays(trade.buy_date, trade.sell_date)
        : 0,
    capitalGain,
    capitalGainPercentage,
    gainLossType: classifyCapitalGain(capitalGain),
  };
}

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private currentAccount = selectCurrentAccountSignal(
    this.currentAccountSignalStore
  );

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  trades = computed(() => {
    return this.currentAccount().soldTrades as Trade[];
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  selectSoldPositions = computed(() => {
    const trades = this.trades();

    const totalLength = trades.length;
    if (totalLength === 0) {
      return [] as ClosedPosition[];
    }

    const soldPositions = new Array<ClosedPosition>(totalLength);

    for (let i = 0; i < totalLength; i++) {
      const trade = trades[i];
      if (trade === undefined || typeof trade === 'string') {
        soldPositions[i] = buildPlaceholderClosedPosition(
          `placeholder-${String(i)}`
        );
        continue;
      }
      soldPositions[i] = buildFullClosedPosition(trade);
    }

    return soldPositions;
  });
}
