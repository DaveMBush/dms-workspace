import { computed, inject, Injectable, signal } from '@angular/core';

import { buildUniverseMap } from '../../shared/build-universe-map.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Trade } from '../../store/trades/trade.interface';
import { Universe } from '../../store/universe/universe.interface';
import { classifyCapitalGain } from './classify-capital-gain.function';

function buildPlaceholderClosedPosition(id: string): ClosedPosition {
  return {
    id,
    symbol: '',
    buy: 0,
    buy_date: '',
    quantity: 0,
    sell: 0,
    sell_date: undefined,
    daysHeld: 0,
    capitalGain: 0,
    capitalGainPercentage: 0,
  };
}

function buildPartialClosedPosition(trade: Trade): ClosedPosition {
  return {
    id: trade.id,
    symbol: '',
    buy: trade.buy,
    buy_date: trade.buy_date,
    quantity: trade.quantity,
    sell: trade.sell,
    sell_date: trade.sell_date,
    daysHeld: 0,
    capitalGain: 0,
    capitalGainPercentage: 0,
  };
}

function buildFullClosedPosition(
  trade: Trade,
  universe: Universe
): ClosedPosition {
  const capitalGain = (trade.sell - trade.buy) * trade.quantity;
  const capitalGainPercentage =
    trade.buy !== 0 ? ((trade.sell - trade.buy) / trade.buy) * 100 : 0;
  return {
    id: trade.id,
    symbol: universe.symbol,
    buy: trade.buy,
    buy_date: trade.buy_date,
    quantity: trade.quantity,
    sell: trade.sell,
    sell_date: trade.sell_date,
    daysHeld: differenceInTradingDays(trade.buy_date, trade.sell_date!),
    capitalGain,
    capitalGainPercentage,
    gainLossType: classifyCapitalGain(capitalGain),
  };
}

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    return currentAccount().soldTrades as Trade[];
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
  selectSoldPositions = computed(() => {
    const trades = this.trades();
    const universeMap = buildUniverseMap();

    const totalLength = trades.length;
    if (totalLength === 0) {
      return [] as ClosedPosition[];
    }

    const smartArr = trades as unknown as {
      getIdAtIndex?(i: number): string | undefined;
    };
    const isProxy = typeof smartArr.getIdAtIndex === 'function';

    const range = this.visibleRange();
    const visStart = Math.max(0, range.start - 20);
    const visEnd = Math.min(totalLength, range.end + 20);

    const soldPositions = new Array<ClosedPosition>(totalLength);

    for (let i = 0; i < totalLength; i++) {
      if (isProxy && !(i >= visStart && i < visEnd)) {
        soldPositions[i] = buildPlaceholderClosedPosition(
          smartArr.getIdAtIndex!(i) ?? `placeholder-${String(i)}`
        );
        continue;
      }
      const trade = trades[i];
      if (typeof trade === 'string') {
        soldPositions[i] = buildPlaceholderClosedPosition(trade);
        continue;
      }
      const universe = universeMap.get(trade.universeId);
      soldPositions[i] =
        universe === undefined
          ? buildPartialClosedPosition(trade)
          : buildFullClosedPosition(trade, universe);
    }

    return soldPositions;
  });
}
