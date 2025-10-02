import yahooFinance from 'yahoo-finance2';

import { logger } from '../../../utils/structured-logger';

/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related distribution API functions */

// Global rate limiting - track last API call time
let lastApiCallTime = 0;
const YAHOO_RATE_LIMIT_DELAY = 10 * 1000; // 10 seconds in milliseconds

export interface ProcessedRow {
  amount: number;
  date: Date;
}

interface CalendarDividendEvent {
  amount: number;
  date: number;
}

export async function enforceYahooFinanceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < YAHOO_RATE_LIMIT_DELAY) {
    const waitTime = YAHOO_RATE_LIMIT_DELAY - timeSinceLastCall;
    // eslint-disable-next-line no-restricted-syntax -- Promise
    await new Promise(function rateLimitPromise(resolve) {
      setTimeout(resolve, waitTime);
    });
  }
}

export function updateLastApiCallTime(): void {
  lastApiCallTime = Date.now();
}

export function processYahooFinanceDividendData(
  dividends: Array<{ amount: number; date: number }>
): ProcessedRow[] {
  return dividends
    .map(function mapDividendRow(dividend): ProcessedRow {
      return {
        amount: dividend.amount,
        date: new Date(dividend.date * 1000), // Convert Unix timestamp to Date
      };
    })
    .filter(function filterValidDates(row: ProcessedRow): boolean {
      return !isNaN(row.date.valueOf()) && row.amount > 0;
    })
    .sort(function sortByDate(a: ProcessedRow, b: ProcessedRow): number {
      return a.date.valueOf() - b.date.valueOf();
    });
}

interface SummaryDetail {
  exDividendDate?: Date | number;
  dividendRate?: number;
}

function isValidSummaryDetail(
  summaryDetail: SummaryDetail | undefined
): boolean {
  if (!summaryDetail) {
    return false;
  }

  if (
    summaryDetail.exDividendDate === null ||
    summaryDetail.exDividendDate === undefined
  ) {
    return false;
  }

  return !(
    summaryDetail.dividendRate === null ||
    summaryDetail.dividendRate === undefined ||
    summaryDetail.dividendRate === 0
  );
}

function convertToDate(exDividendDate: Date | number): Date {
  return exDividendDate instanceof Date
    ? exDividendDate
    : new Date(exDividendDate * 1000);
}

function extractFutureDividendFromSummary(
  summaryDetail: SummaryDetail | undefined,
  today: Date,
  symbol: string,
  historicalDividends: ProcessedRow[]
): ProcessedRow | null {
  if (!isValidSummaryDetail(summaryDetail)) {
    return null;
  }

  const hasValidExDate =
    typeof summaryDetail!.exDividendDate === 'number' ||
    summaryDetail!.exDividendDate instanceof Date;

  if (!hasValidExDate) {
    return null;
  }

  const exDivDate = convertToDate(summaryDetail!.exDividendDate!);

  if (exDivDate <= today) {
    return null;
  }

  // Use amount from most recent historical dividend if available
  // as summaryDetail.dividendRate is often annualized
  let dividendAmount = summaryDetail!.dividendRate!;
  if (historicalDividends.length > 0) {
    const mostRecentHistorical =
      historicalDividends[historicalDividends.length - 1];
    dividendAmount = mostRecentHistorical.amount;
  }

  logger.debug(`Found future dividend for ${symbol}`, {
    symbol,
    nextExDate: exDivDate.toISOString(),
    amount: dividendAmount,
    originalSummaryAmount: summaryDetail!.dividendRate,
  });

  return {
    amount: dividendAmount,
    date: exDivDate,
  };
}

interface CalendarEvents {
  dividends?: CalendarDividendEvent[];
}

function extractFutureDividendsFromCalendar(
  calendarEvents: CalendarEvents | undefined,
  today: Date
): ProcessedRow[] {
  if (!calendarEvents?.dividends || !Array.isArray(calendarEvents.dividends)) {
    return [];
  }

  return calendarEvents.dividends
    .filter(function filterFutureDividends(
      event: CalendarDividendEvent
    ): boolean {
      const eventDate = new Date(event.date * 1000);
      return eventDate > today && event.amount > 0;
    })
    .map(function mapCalendarDividend(
      event: CalendarDividendEvent
    ): ProcessedRow {
      return {
        amount: event.amount,
        date: new Date(event.date * 1000),
      };
    });
}

function removeDuplicateDividends(dividends: ProcessedRow[]): ProcessedRow[] {
  return dividends.filter(function removeDuplicates(
    dividend: ProcessedRow,
    index: number
  ): boolean {
    return (
      dividends.findIndex(function findDuplicate(other: ProcessedRow): boolean {
        const timeDiff = Math.abs(
          other.date.valueOf() - dividend.date.valueOf()
        );
        const amountDiff = Math.abs(other.amount - dividend.amount);
        return timeDiff < 24 * 60 * 60 * 1000 && amountDiff < 0.01;
      }) === index
    );
  });
}

interface YahooChartData {
  events?: {
    dividends?: unknown;
  };
}

interface YahooQuoteSummary {
  summaryDetail?: unknown;
  calendarEvents?: unknown;
}

async function fetchYahooFinanceData(
  symbol: string,
  oneYearAgo: Date,
  today: Date
): Promise<[YahooChartData, YahooQuoteSummary | null]> {
  return Promise.all([
    yahooFinance.chart(symbol, {
      period1: oneYearAgo,
      period2: today,
      events: 'dividends',
    }),
    yahooFinance
      .quoteSummary(symbol, {
        modules: ['summaryDetail', 'defaultKeyStatistics', 'calendarEvents'],
      })
      .catch(function handleQuoteSummaryError() {
        return null;
      }),
  ]);
}

function processHistoricalDividends(chartData: YahooChartData): ProcessedRow[] {
  if (
    chartData.events?.dividends === undefined ||
    chartData.events?.dividends === null
  ) {
    return [];
  }

  const dividends = chartData.events.dividends as unknown as Array<{
    amount: number;
    date: number;
  }>;
  return processYahooFinanceDividendData(dividends);
}

function processFutureDividends(
  quoteSummary: YahooQuoteSummary | null,
  today: Date,
  symbol: string,
  historicalDividends: ProcessedRow[]
): ProcessedRow[] {
  if (!quoteSummary) {
    return [];
  }

  const futureDividends: ProcessedRow[] = [];

  const futureDividend = extractFutureDividendFromSummary(
    quoteSummary.summaryDetail as SummaryDetail | undefined,
    today,
    symbol,
    historicalDividends
  );
  if (futureDividend) {
    futureDividends.push(futureDividend);
  }

  const calendarDividends = extractFutureDividendsFromCalendar(
    quoteSummary.calendarEvents as CalendarEvents | undefined,
    today
  );
  futureDividends.push(...calendarDividends);

  return futureDividends;
}

function combineAndProcessDividends(
  historicalDividends: ProcessedRow[],
  futureDividends: ProcessedRow[],
  symbol: string
): ProcessedRow[] {
  const allDividends = [...historicalDividends, ...futureDividends];
  const uniqueDividends = removeDuplicateDividends(allDividends);

  uniqueDividends.sort(function sortByDate(
    a: ProcessedRow,
    b: ProcessedRow
  ): number {
    return a.date.valueOf() - b.date.valueOf();
  });

  logger.debug(
    `Found ${uniqueDividends.length} total dividend events for ${symbol}`,
    {
      symbol,
      totalDividends: uniqueDividends.length,
      historicalCount: historicalDividends.length,
      futureCount: futureDividends.length,
    }
  );

  return uniqueDividends;
}

export async function fetchDistributionData(
  symbol: string
): Promise<ProcessedRow[]> {
  await enforceYahooFinanceRateLimit();
  updateLastApiCallTime();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);

  try {
    logger.debug(`Fetching dividend data for ${symbol} from Yahoo Finance`, {
      symbol,
      period1: oneYearAgo.toISOString(),
      period2: today.toISOString(),
    });

    const [chartData, quoteSummary] = await fetchYahooFinanceData(
      symbol,
      oneYearAgo,
      today
    );

    logger.debug(`Yahoo Finance API calls successful for ${symbol}`);

    const historicalDividends = processHistoricalDividends(chartData);
    const futureDividends = processFutureDividends(
      quoteSummary,
      today,
      symbol,
      historicalDividends
    );

    return combineAndProcessDividends(
      historicalDividends,
      futureDividends,
      symbol
    );
  } catch (error) {
    logger.error(
      `Yahoo Finance API error for ${symbol}`,
      error instanceof Error ? error : undefined,
      {
        symbol,
        operation: 'fetchDividendData',
      }
    );
    return [];
  }
}
