import { computed, inject, Injectable } from '@angular/core';
import { RowProxyDelete, SmartArray } from '@smarttools/smart-signals';

import { Account } from '../../accounts/account';
import { buildUniverseMap } from '../../shared/universe-utils.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';
import { Universe } from '../../store/universe/universe.interface';
@Injectable({ providedIn: 'root' })
export class OpenPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- will hide this
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    return currentAccount().trades as Trade[];
  });

  deleteOpenPosition(position: OpenPosition): void {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
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
      if (this.isClosed(trade, universe!)) {
        continue;
      }
      const daysHeld = this.differenceInTradingDaysPrivate(
        trade.buy_date,
        new Date().toISOString()
      );
      const expectedYield = this.getExpectedYield(universe!, trade);

      const targetGain = this.getTargetGain(
        universe!,
        trade,
        daysHeld,
        expectedYield
      );
      const sellDate =
        trade.sell_date !== undefined ? new Date(trade.sell_date) : undefined;
      openPositions.push({
        id: trade.id,
        symbol: universe!.symbol,
        exDate: universe!.ex_date || null,
        buy: trade.buy,
        buyDate: new Date(trade.buy_date),
        sell: trade.sell,
        sellDate,
        daysHeld,
        expectedYield,
        targetGain,
        targetSell: targetGain / trade.quantity + trade.buy,
        quantity: trade.quantity,
        lastPrice: universe!.last_price,
        unrealizedGainPercent:
          ((universe!.last_price - trade.buy) / trade.buy) * 100,
        unrealizedGain: (universe!.last_price - trade.buy) * trade.quantity,
      });
    }
    return openPositions;
  });

  private differenceInTradingDaysPrivate(start: string, end: string): number {
    return differenceInTradingDays(start, end);
  }

  private universeMap(): Map<string, Universe> {
    return buildUniverseMap();
  }

  private getFormulaExDate(universe: Universe): Date {
    if (!universe?.ex_date) {
      // Return current date as fallback when ex_date is null
      return new Date();
    }
    const formulaExDate = new Date(universe.ex_date);
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
    return (
      universe === undefined ||
      (trade.sell > 0 && trade.sell_date !== undefined)
    );
  }

  private getExpectedYield(universe: Universe, trade: Trade): number {
    return universe?.distribution ? trade.quantity * universe.distribution : 0;
  }

  private getTargetGain(
    universe: Universe,
    trade: Trade,
    daysHeld: number,
    expectedYield: number
  ): number {
    const formulaExDate = this.getFormulaExDate(universe);
    const tradingDaysToExDate = this.differenceInTradingDaysPrivate(
      trade.buy_date,
      formulaExDate.toISOString()
    );

    const targetGainFactor = (3 * daysHeld) / tradingDaysToExDate;
    return Math.min(
      expectedYield,
      universe?.distribution
        ? targetGainFactor * universe.distribution * trade.quantity
        : 0
    );
  }
}
