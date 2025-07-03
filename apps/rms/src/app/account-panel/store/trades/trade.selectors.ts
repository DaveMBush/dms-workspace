import { createSmartSignal, getTopChildRows } from '@smarttools/smart-signals';
import { Account } from '../../../accounts/store/accounts/account.interface';
import { Trade } from './trade.interface';
import { selectAccountsEntity } from '../../../accounts/store/accounts/account.selectors';
import { computed } from '@angular/core';
import { selectUniverses } from '../../../store/universe/universe.selectors';
import { OpenPosition } from './open-position.interface';
import { ClosedPosition } from './closed-position.interface';
import { Universe } from '../../../store/universe/universe.interface';

export const selectTradesEntity = createSmartSignal<Trade>(
  'app',
  'trades'
);

export const selectAccountTrades = createSmartSignal(selectAccountsEntity, [
  {
    childFeature: 'app',
    childEntity: 'trades',
    parentField: 'trades',
    parentFeature: 'app',
    parentEntity: 'accounts',
    childSelector: selectTradesEntity,
  },
]);

export const selectTrades = getTopChildRows<Account, Trade>(
  selectAccountTrades,
  'trades'
);

export const selectClosedPositions = computed(() => {
  const trades = selectTrades();
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
    // now that we have an ex_date, how many trading days between
    // now and the formulaExDate?
    const tradingDaysToExDate = differenceInTradingDays(
      trade.buy_date,
      formulaExDate.toISOString());
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

export const selectOpenPositions = computed(() => {
  const trades = selectTrades();
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
    // now that we have an ex_date, how many trading days between
    // now and the formulaExDate?
    const tradingDaysToExDate = differenceInTradingDays(
      trade.buy_date,
      formulaExDate.toISOString());
    const daysHeld = differenceInTradingDays(trade.buy_date, (new Date()).toISOString());
    const targetGainFactor = 3 * daysHeld / tradingDaysToExDate;
    const expectedYield = universe?.distribution ? trade.quantity * universe.distribution : 0;
    const targetGain = Math.min(expectedYield, universe?.distribution ? targetGainFactor * universe.distribution * trade.quantity : 0);
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

function differenceInTradingDays(
  start: string,
  end: string
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  let current = new Date(startDate);

  const holidays = [] as string[];

  // Normalize holidays to a Set for fast lookup
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
