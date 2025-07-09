import { Injectable, computed, inject } from '@angular/core';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Universe } from '../../store/universe/universe.interface';

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
    return currentAccount().trades as Trade[];
  });

  selectClosedPositions = computed(() => {
    const trades = this.trades();
    const universes = selectUniverses();
    const universeMap = new Map<string, Universe>();
    let universe: Universe | undefined;
    for (let j = 0; j < universes.length; j++) {
      universe = universes[j];
      if (universe.symbol.length === 0) {
        continue;
      }
      universeMap.set(universe.id, universe);
    }
    const closedPositions = [] as ClosedPosition[];
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.sell === 0 || !trade.sell_date) {
        continue;
      }
      universe = universeMap.get(trade.universeId);
      if (!universe) {
        continue;
      }
      const formulaExDate = new Date(universe?.ex_date);
      if (formulaExDate.valueOf() < new Date().valueOf()) {
        if (universe.distribution === 12) {
          // assume the next ex_date is the next month
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setMonth(formulaExDate.getMonth() + 1);
          }
        } else if (universe.distribution === 4) {
          // assume the next ex_date is the next quarter
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setMonth(formulaExDate.getMonth() + 3);
          }
        } else {
          // assume it is a year from the last one
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setFullYear(formulaExDate.getFullYear() + 1);
          }
        }
      }
      const daysHeld = differenceInTradingDays(trade.buy_date, trade.sell_date);
      closedPositions.push({
        id: trade.id,
        symbol: universe?.symbol,
        buy: trade.buy,
        buyDate: new Date(trade.buy_date),
        sell: trade.sell,
        sellDate: trade.sell_date ? new Date(trade.sell_date) : undefined,
        daysHeld: daysHeld,
        quantity: trade.quantity,
        capitalGain: (trade.sell - trade.buy) * trade.quantity,
        capitalGainPercentage: (trade.sell - trade.buy) / trade.buy * 100,
      });
    }
    return closedPositions;
  });

  getClosedPositions = this.selectClosedPositions;
}
