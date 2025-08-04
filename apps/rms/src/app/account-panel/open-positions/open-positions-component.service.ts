import { computed, inject,Injectable } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';

import { Account } from '../../accounts/account';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { selectHolidays } from '../../store/top/selectors/select-holidays.function';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { OpenPosition as OpenPositionInterface } from './open-position.interface';
@Injectable({ providedIn: 'root' })
export class OpenPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
    return currentAccount().trades as Trade[];
  });

    deleteOpenPosition(position: OpenPositionInterface): void {
    const currentAccount = selectCurrentAccountSignal(this.currentAccountSignalStore);
    const trades = currentAccount().trades as Trade[];
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
    const universeMap = this.universeMap();
    const openPositions = [] as OpenPosition[];
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const universe = universeMap.get(trade.universeId);
      if (this.isClosed(trade,universe!)) {
        continue;
      }
      const daysHeld = this.differenceInTradingDays(
        trade.buy_date,
        new Date().toISOString()
      );
      const expectedYield = this.getExpectedYield(universe!, trade);

      const targetGain = this.getTargetGain(universe!, trade, daysHeld, expectedYield);
      const sellDate = trade.sell_date !== undefined ? new Date(trade.sell_date) : undefined;
      openPositions.push({
        id: trade.id,
        symbol: universe!.symbol,
        exDate: universe!.ex_date,
        buy: trade.buy,
        buyDate: new Date(trade.buy_date),
        sell: trade.sell,
        sellDate,
        daysHeld,
        expectedYield,
        targetGain,
        targetSell: (targetGain / trade.quantity) + trade.buy,
        quantity: trade.quantity,
        lastPrice: universe!.last_price,
        unrealizedGainPercent: (universe!.last_price - trade.buy) / trade.buy * 100,
        unrealizedGain: (universe!.last_price - trade.buy) * trade.quantity,
      });
    }
    return openPositions;
  });


  // Helper function for trading days
  private differenceInTradingDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const current = new Date(startDate);
    const holidays = selectHolidays();
    const holidaySet = new Set(holidays.map(function mapDate(d) {
      return new Date(d).toDateString();
    }));
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

  private universeMap(): Map<string, Universe> {
    const universes = selectUniverses();
    const universeMap = new Map<string, Universe>();
    for (let j = 0; j < universes.length; j++) {
      const universe = universes[j];
      if (universe.symbol.length === 0) {
        continue;
      }
      universeMap.set(universe.id, universe);
    }
    return universeMap;
  }

  private getFormulaExDate(universe: Universe): Date {
    const formulaExDate = new Date(universe?.ex_date);
    if (formulaExDate.valueOf() >= new Date().valueOf()) {
      return formulaExDate;
    }
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
    return formulaExDate;
  }

  private isClosed(trade: Trade, universe: Universe): boolean {
    return universe === undefined || (trade.sell > 0 && trade.sell_date !== undefined) ;
  }

  private getExpectedYield(universe: Universe, trade: Trade): number {
    return universe?.distribution ? trade.quantity * universe.distribution : 0;
  }

  private getTargetGain(universe: Universe, trade: Trade, daysHeld: number, expectedYield: number): number {
    const formulaExDate = this.getFormulaExDate(universe);
    const tradingDaysToExDate = this.differenceInTradingDays(
      trade.buy_date,
      formulaExDate.toISOString()
    );

    const targetGainFactor = 3 * daysHeld / tradingDaysToExDate;
    return Math.min(
      expectedYield,
      universe?.distribution ? targetGainFactor * universe.distribution * trade.quantity : 0
    );
  }
}
