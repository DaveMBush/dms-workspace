import yahooFinance from "yahoo-finance2";
import { sleep } from "./sleep.function";

export async function getLastPrice(symbol: string, retryCount: number = 0) {
  try {
    if (retryCount > 0) {
      await sleep(1000);
    }
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice;
  } catch (error) {
    if (retryCount < 3) {
      return getLastPrice(symbol, retryCount + 1);
    }
    return null;
  }
}
