import { computed, inject, Injectable } from '@angular/core';

import { buildUniverseMap } from '../../shared/universe-utils.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { selectCurrentAccountSignal } from '../../store/current-account/select-current-account.signal';
import { ClosedPosition } from '../../store/trades/closed-position.interface';
import { differenceInTradingDays } from '../../store/trades/difference-in-trading-days.function';
import { Trade } from '../../store/trades/trade.interface';
import { Universe } from '../../store/universe/universe.interface';
import { calculateCapitalGains } from './capital-gains-calculator.function';

@Injectable({ providedIn: 'root' })
export class SoldPositionsComponentService {
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private closedPositionCache = new Map<string, ClosedPosition>();

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  trades = computed(() => {
    const currentAccount = selectCurrentAccountSignal(
      this.currentAccountSignalStore
    );
    return currentAccount().trades as Trade[];
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  selectClosedPositions = computed(() => {
    const trades = this.trades();
    const universeMap = this.buildUniverseMapPrivate();
    const closedPositions = [] as ClosedPosition[];
    const seenIds = new Set<string>();

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (!this.isValidSoldTrade(trade)) {
        continue;
      }

      const universe = universeMap.get(trade.universeId);
      if (!universe) {
        continue;
      }

      const closedPosition = this.createClosedPosition(trade, universe);
      if (closedPosition) {
        this.updateCache(closedPosition);
        closedPositions.push(closedPosition);
        seenIds.add(closedPosition.id);
      }
    }

    this.cleanupCache(seenIds);
    return closedPositions;
  });

  getClosedPositions = this.selectClosedPositions;

  private buildUniverseMapPrivate(): Map<string, Universe> {
    return buildUniverseMap();
  }

  private isValidSoldTrade(trade: Trade): boolean {
    return (
      trade.sell !== 0 &&
      trade.sell_date !== undefined &&
      trade.sell_date !== null &&
      trade.sell_date !== ''
    );
  }

  private calculateNextExDate(universe: Universe): Date {
    const formulaExDate = new Date(universe.ex_date);
    const today = new Date();

    if (formulaExDate.valueOf() >= today.valueOf()) {
      return formulaExDate;
    }

    return this.adjustExDateForFrequency(
      formulaExDate,
      universe.distributions_per_year
    );
  }

  private adjustExDateForFrequency(
    exDate: Date,
    distributionsPerYear: number
  ): Date {
    const today = new Date();
    const adjustedDate = new Date(exDate);

    if (distributionsPerYear === 12) {
      while (adjustedDate.valueOf() < today.valueOf()) {
        adjustedDate.setMonth(adjustedDate.getMonth() + 1);
      }
    } else if (distributionsPerYear === 4) {
      while (adjustedDate.valueOf() < today.valueOf()) {
        adjustedDate.setMonth(adjustedDate.getMonth() + 3);
      }
    } else {
      while (adjustedDate.valueOf() < today.valueOf()) {
        adjustedDate.setFullYear(adjustedDate.getFullYear() + 1);
      }
    }

    return adjustedDate;
  }

  private createClosedPosition(
    trade: Trade,
    universe: Universe
  ): ClosedPosition | null {
    if (
      trade.sell_date === undefined ||
      trade.sell_date === null ||
      trade.sell_date === ''
    ) {
      return null;
    }

    const daysHeld = differenceInTradingDays(trade.buy_date, trade.sell_date);
    const capitalGainsResult = calculateCapitalGains({
      buy: trade.buy,
      sell: trade.sell,
      quantity: trade.quantity,
    });

    return {
      id: trade.id,
      symbol: universe.symbol,
      buy: trade.buy,
      buyDate: new Date(trade.buy_date),
      sell: trade.sell,
      sellDate: new Date(trade.sell_date),
      daysHeld,
      quantity: trade.quantity,
      capitalGain: capitalGainsResult.capitalGain,
      capitalGainPercentage: capitalGainsResult.capitalGainPercentage,
    };
  }

  private updateCache(closedPosition: ClosedPosition): void {
    const existingRow = this.closedPositionCache.get(closedPosition.id);

    if (!existingRow) {
      this.closedPositionCache.set(closedPosition.id, closedPosition);
    } else {
      Object.assign(existingRow, closedPosition);
    }
  }

  private cleanupCache(seenIds: Set<string>): void {
    for (const id of this.closedPositionCache.keys()) {
      if (!seenIds.has(id)) {
        this.closedPositionCache.delete(id);
      }
    }
  }
}
