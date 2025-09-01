import { axiosGetWithBackoff } from './axios-get-with-backoff.function';

/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related distribution API functions */

// Global rate limiting - track last API call time
let lastApiCallTime = 0;
const RATE_LIMIT_DELAY = 60 * 1000; // 1 minute in milliseconds

export interface DistributionRow {
  TotDiv: number;
  ExDivDateDisplay: string;
}

export interface ProcessedRow {
  amount: number;
  date: Date;
}

export async function enforceDistributionApiRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
    // eslint-disable-next-line no-restricted-syntax -- Promise
    await new Promise(function rateLimitPromise(resolve) {
      setTimeout(resolve, waitTime);
    });
  }
}

export function updateLastApiCallTime(): void {
  lastApiCallTime = Date.now();
}

export function formatDistributionDate(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

export function createDistributionApiHeaders(
  symbol: string
): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    Referer: `https://www.cefconnect.com/fund/${symbol}`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

export function buildDistributionApiUrl(
  symbol: string,
  oneYearAgo: Date,
  today: Date
): string {
  return `https://www.cefconnect.com/api/v3/distributionhistory/fund/${symbol}/${formatDistributionDate(
    oneYearAgo
  )}/${formatDistributionDate(today)}`;
}

export function processDistributionApiData(
  data: DistributionRow[]
): ProcessedRow[] {
  return data
    .map(function mapDistributionRow(row: DistributionRow): ProcessedRow {
      return {
        amount: row.TotDiv,
        date: new Date(row.ExDivDateDisplay),
      };
    })
    .filter(function filterValidDates(row: ProcessedRow): boolean {
      return !isNaN(row.date.valueOf());
    })
    .sort(function sortByDate(a: ProcessedRow, b: ProcessedRow): number {
      return a.date.valueOf() - b.date.valueOf();
    });
}

export async function fetchDistributionData(
  symbol: string
): Promise<ProcessedRow[]> {
  await enforceDistributionApiRateLimit();
  updateLastApiCallTime();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);
  const url = buildDistributionApiUrl(symbol, oneYearAgo, today);

  const response = await axiosGetWithBackoff<{ Data?: DistributionRow[] }>(
    url,
    { headers: createDistributionApiHeaders(symbol) },
    {
      baseDelayMs: 5000,
      maxRetries: 3,
    }
  );

  const responseData = response.data as
    | { Data?: DistributionRow[] }
    | undefined;
  const data = responseData?.Data ?? [];

  return processDistributionApiData(data);
}
