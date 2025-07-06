import { Injectable, computed, inject } from '@angular/core';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/universe.selectors';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';

@Injectable({ providedIn: 'root' })
export class OpenPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  // Helper function for trading days
  private differenceInTradingDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    let current = new Date(startDate);
    const holidays = [] as string[];
    const holidaySet = new Set(holidays.map(d => new Date(d).toDateString()));
    while (current <= endDate) {
      const day = current.getDay();
      const isWeekend = day === 0 || day === 6;
      const isHoliday = holidaySet.has(current.toDateString());
      if (!isWeekend && !isHoliday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  selectOpenPositions = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
    const trades = currentAccount().trades as Trade[];
    const universes = selectUniverses();
    const universeMap = new Map<string, any>();
    let universe: any;
    for (let j = 0; j < universes.length; j++) {
      universe = universes[j];
      if (universe.symbol.length === 0) {
        continue;
      }
      universeMap.set(universe.id, universe);
    }
    const openPositions = [] as OpenPosition[];
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.sell > 0 && trade.sell_date) {
        continue;
      }
      universe = universeMap.get(trade.universeId);
      if (!universe) {
        continue;
      }
      const formulaExDate = new Date(universe?.ex_date);
      if (formulaExDate.valueOf() < new Date().valueOf()) {
        if (universe.distribution === 12) {
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setMonth(formulaExDate.getMonth() + 1);
          }
        } else if (universe.distribution === 4) {
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setMonth(formulaExDate.getMonth() + 3);
          }
        } else {
          while (formulaExDate.valueOf() < new Date().valueOf()) {
            formulaExDate.setFullYear(formulaExDate.getFullYear() + 1);
          }
        }
      }
      const tradingDaysToExDate = this.differenceInTradingDays(
        trade.buy_date,
        formulaExDate.toISOString()
      );
      const daysHeld = this.differenceInTradingDays(
        trade.buy_date,
        new Date().toISOString()
      );
      const targetGainFactor = 3 * daysHeld / tradingDaysToExDate;
      const expectedYield = universe?.distribution ? trade.quantity * universe.distribution : 0;
      const targetGain = Math.min(
        expectedYield,
        universe?.distribution ? targetGainFactor * universe.distribution * trade.quantity : 0
      );
      openPositions.push({
        id: trade.id,
        symbol: universe?.symbol,
        exDate: universe?.ex_date,
        buy: trade.buy,
        buyDate: new Date(trade.buy_date),
        sell: trade.sell,
        sellDate: trade.sell_date ? new Date(trade.sell_date) : undefined,
        daysHeld: daysHeld,
        expectedYield,
        targetGain,
        targetSell: (targetGain / trade.quantity) + trade.buy,
        quantity: trade.quantity,
        lastPrice: universe?.last_price,
        unrealizedGainPercent: (universe?.last_price - trade.buy) / trade.buy * 100,
        unrealizedGain: (universe?.last_price - trade.buy) * trade.quantity,
      });
    }
    return openPositions;
  });
}
