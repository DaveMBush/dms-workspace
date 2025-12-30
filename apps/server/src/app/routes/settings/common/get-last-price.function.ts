import { yahooFinance } from '../yahoo-finance.instance';
import { sleep } from './sleep.function';

export async function getLastPrice(
  symbol: string,
  retryCount: number = 0
): Promise<number | undefined> {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice as number | undefined;
  } catch {
    if (retryCount < 3) {
      return getLastPrice(symbol, retryCount + 1);
    }
    return undefined;
  }
}
