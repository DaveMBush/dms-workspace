import axios from "axios";

// Global rate limiting - track last API call time
let lastApiCallTime = 0;
const RATE_LIMIT_DELAY = 60 * 1000; // 1 minute in milliseconds

interface DistributionRow {
  TotDiv: number;
  ExDivDateDisplay: string;
}

interface ProcessedRow {
  amount: number;
  date: Date;
}

async function enforceRateLimit(): Promise<void> {
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

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

function createRequestHeaders(symbol: string): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': `https://www.cefconnect.com/fund/${symbol}`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

function processDistributionData(data: DistributionRow[]): ProcessedRow[] {
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

function hasDecliningTrend(recentExDates: ProcessedRow[]): boolean {
  if (recentExDates.length < 3) {
    return false; // Not enough data to determine trend
  }

  const currentDistribution = recentExDates[2].amount;      // Most recent
  const previousDistribution = recentExDates[1].amount;     // Middle
  const distributionBeforePrevious = recentExDates[0].amount; // Oldest

  return currentDistribution < previousDistribution && previousDistribution < distributionBeforePrevious;
}

export async function getConsistentDistributions(symbol: string): Promise<boolean> {
  await enforceRateLimit();
  lastApiCallTime = Date.now();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);
  const url = `https://www.cefconnect.com/api/v3/distributionhistory/fund/${symbol}/${formatDate(oneYearAgo)}/${formatDate(today)}`;

  const response = await axios.get(url, {
    headers: createRequestHeaders(symbol),
  });

  const responseData = response.data as { Data?: DistributionRow[] } | undefined;
  const data = responseData?.Data ?? [];
  if (data.length === 0) {
    return false;
  }

  const rows = processDistributionData(data);
  const recentExDates = rows.slice(-3);

  if (recentExDates.length < 3) {
    return true; // Not enough data to determine trend
  }

  return !hasDecliningTrend(recentExDates);
}
