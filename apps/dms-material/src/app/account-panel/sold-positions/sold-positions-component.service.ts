import { computed, inject, Injectable } from '@angular/core';

import { buildUniverseMap } from '../../shared/build-universe-map.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Trade } from '../../store/trades/trade.interface';

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    return currentAccount().trades as Trade[];
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  selectSoldPositions = computed(() => {
    const trades = this.trades();
    const universeMap = buildUniverseMap();
    const soldPositions: ClosedPosition[] = [];

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (!this.isValidSoldTrade(trade)) {
        continue;
      }

      const universe = universeMap.get(trade.universeId);
      if (!universe) {
        continue;
      }

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
      });
    }

    return soldPositions;
  });

  private isValidSoldTrade(trade: Trade): boolean {
    return (
      trade.sell !== 0 &&
      trade.sell_date !== undefined &&
      trade.sell_date !== null &&
      trade.sell_date !== ''
    );
  }
}
