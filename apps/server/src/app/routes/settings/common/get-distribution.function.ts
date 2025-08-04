import yahooFinance from "yahoo-finance2";

import { sleep } from "./sleep.function";

interface Dividend {
  date: Date;
  amount: number;
}

interface DistributionResult {
  distribution: number;
  ex_date: Date;
  distributions_per_year: number;
}

interface YahooFinanceResult {
  events?: {
    dividends?: Array<{
      date: Date;
      amount: number;
    }>;
  };
}

function createDateRange(): { oneYearAgo: Date; oneMonthFromNow: Date } {
  const exDate = new Date();
  const oneYearAgo = new Date(exDate.valueOf() - (365 * 24 * 60 * 60 * 1000));
  const oneMonthFromNow = new Date(exDate.valueOf() + (31 * 24 * 60 * 60 * 1000));
  return { oneYearAgo, oneMonthFromNow };
}

function processDividends(result: YahooFinanceResult): Dividend[] | null {
  const dividends = result.events?.dividends
    ?.filter(function filterValidDividends(r): boolean {
      return r !== null && r !== undefined;
    })
    .map(function mapDividendData(r): Dividend {
      return {
        date: r.date,
        amount: r.amount,
      };
    });

  if (!dividends || dividends.length === 0) {
    return null;
  }

  return dividends;
}

function findCurrentDividend(dividends: Dividend[]): Dividend {
  const currentDividend = dividends.find(function findCurrentDividendPredicate(d: Dividend): boolean {
    return d.date.valueOf() >= Date.now().valueOf();
  });

  if (currentDividend) {
    return currentDividend;
  }

  return dividends[dividends.length - 1];
}

function calculateDistributionsPerYear(dividends: Dividend[], currentDividend: Dividend): number {
  const currentIndex = dividends.findIndex(function findCurrentIndex(d: Dividend): boolean {
    return d.date.valueOf() === currentDividend.date.valueOf();
  });
  const previousIndex = currentIndex - 1;

  if (previousIndex < 0) {
    return 1;
  }

  const previousDividend = dividends[previousIndex];
  const previousMonth = previousDividend.date.getMonth();
  const currentMonth = currentDividend.date.getMonth();

  if (previousMonth < currentMonth - 1) {
    return 4;
  }

  return 12;
}

export async function getDistribution(symbol: string, retryCount: number = 0): Promise<DistributionResult | null> {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }

    const { oneYearAgo, oneMonthFromNow } = createDateRange();
    const result = await yahooFinance.chart(symbol, {
      period1: oneYearAgo.toISOString().slice(0, 10),
      period2: oneMonthFromNow.toISOString().slice(0, 10),
      events: 'dividends',
    });

    const dividends = processDividends(result);
    if (!dividends) {
      return null;
    }

    const currentDividend = findCurrentDividend(dividends);
    const perYear = calculateDistributionsPerYear(dividends, currentDividend);

    return {
      distribution: currentDividend.amount,
      ex_date: currentDividend.date,
      distributions_per_year: perYear,
    };
  } catch {
    if (retryCount < 3) {
      return getDistribution(symbol, retryCount + 1);
    }
    return null;
  }
}
