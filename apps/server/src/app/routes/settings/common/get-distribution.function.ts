import yahooFinance from "yahoo-finance2";
import { sleep } from "./sleep.function";

export async function getDistribution(symbol: string, retryCount: number = 0) {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    let exDate = new Date();
    const oneYearAgo = new Date(exDate.valueOf() - (365 * 24 * 60 * 60 * 1000));
    const oneMonthFromNow = new Date(exDate.valueOf() + (31 * 24 * 60 * 60 * 1000));
    const result = await yahooFinance.chart(symbol, {
      period1: oneYearAgo.toISOString().slice(0, 10),
      period2: oneMonthFromNow.toISOString().slice(0, 10),
      events: 'dividends'
    });
    const dividends = result.events?.dividends?.filter((r) => r).map((r) => ({date: new Date(Number(r.date) * 1000), amount: r.amount}));
    let currentDividend = dividends.find((d) => d.date.valueOf() >= Date.now().valueOf());
    if (!currentDividend) {
      currentDividend = dividends[dividends.length - 1];
    }
    const currentIndex = dividends.findIndex((d) => d.date.valueOf() === currentDividend.date.valueOf());
    const previousIndex = currentIndex - 1;
    let perYear = 1;
    if (previousIndex >= 0) {
      perYear = 12;
      const previousDividend = dividends[previousIndex];
      const previousMonth = previousDividend.date.getMonth();
      const currentMonth = currentDividend.date.getMonth();
      if (previousMonth < currentMonth - 1) {
        perYear = 4
      }
    }
    return {
      distribution: currentDividend.amount,
      ex_date: currentDividend.date,
      distributions_per_year: perYear,
    };
  } catch (error) {
    if (retryCount < 3) {
      return getDistribution(symbol, retryCount + 1);
    }
    return null;
  }
}
