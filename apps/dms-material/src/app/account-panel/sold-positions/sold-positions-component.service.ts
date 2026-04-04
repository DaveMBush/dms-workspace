import { computed, inject, Injectable, signal } from '@angular/core';

import { buildUniverseMap } from '../../shared/build-universe-map.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Trade } from '../../store/trades/trade.interface';
import { classifyCapitalGain } from './classify-capital-gain.function';

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    return currentAccount().soldTrades as Trade[];
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  selectSoldPositions = computed(() => {
    const trades = this.trades();
    const universeMap = buildUniverseMap();

    if (trades.length === 0) {
      return [] as ClosedPosition[];
    }

    // First pass: collect indices of valid sold trades (cheap validation check)
    const soldIndices: number[] = [];
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (!this.isValidSoldTrade(trade)) {
        continue;
      }
      const universe = universeMap.get(trade.universeId);
      if (!universe) {
        continue;
      }
      soldIndices.push(i);
    }

    // Dense array: populate all items to avoid sparse-array/CDK buffer mismatch
    const totalSold = soldIndices.length;
    const soldPositions: ClosedPosition[] = [];
    for (let j = 0; j < totalSold; j++) {
      const tradeIdx = soldIndices[j];
      const trade = trades[tradeIdx];
      const universe = universeMap.get(trade.universeId)!;

      const daysHeld = differenceInTradingDays(
        trade.buy_date,
        trade.sell_date!
      );
      const capitalGain = (trade.sell - trade.buy) * trade.quantity;
      const capitalGainPercentage =
        trade.buy !== 0 ? ((trade.sell - trade.buy) / trade.buy) * 100 : 0;

      soldPositions.push({
        id: trade.id,
        symbol: universe.symbol,
        buy: trade.buy,
        buy_date: trade.buy_date,
        quantity: trade.quantity,
        sell: trade.sell,
        sell_date: trade.sell_date,
        daysHeld,
        capitalGain,
        capitalGainPercentage,
        gainLossType: classifyCapitalGain(capitalGain),
      });
    }

    return soldPositions;
  });

  private isValidSoldTrade(trade: Trade): boolean {
    return (
      trade.sell !== 0 && // also exclude data-entry errors where sell price was not recorded
      trade.sell_date !== undefined &&
      trade.sell_date !== null &&
      trade.sell_date !== ''
    );
  }
}
