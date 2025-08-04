import axios from 'axios';

import { sleep } from './sleep.function';

let lastRequestTime = 0;

interface DistributionRow {
  TotDiv: number;
  ExDivDateDisplay: string;
}

interface ProcessedRow {
  amount: number;
  date: Date;
}

interface DistributionResult {
  distribution: number;
  ex_date: Date;
  distributions_per_year: number;
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  if (now - lastRequestTime < 60_000) {
    return sleep(60_000 - (now - lastRequestTime));
  }
  return Promise.resolve();
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

function buildRequestUrl(symbol: string, oneYearAgo: Date, today: Date): string {
  return `https://www.cefconnect.com/api/v3/distributionhistory/fund/${symbol}/${formatDate(oneYearAgo)}/${formatDate(today)}`;
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

function findNextOrRecentDistribution(rows: ProcessedRow[], today: Date): ProcessedRow {
  const nextOrRecent = rows.find(function findNextDistribution(row: ProcessedRow): boolean {
    return row.date >= today;
  });

  if (nextOrRecent) {
    return nextOrRecent;
  }

  return rows[rows.length - 1]; // most recent past
}

function calculateDistributionsPerYear(rows: ProcessedRow[], today: Date): number {
  if (rows.length <= 1) {
    return 1;
  }

  const recentRows = rows
    .filter(function filterPastDistributions(row: ProcessedRow): boolean {
      return row.date < today;
    })
    .reverse() // oldest to newest
    .slice(-4);

  if (recentRows.length <= 1) {
    return 1;
  }

  const intervals: number[] = [];
  for (let i = 1; i < recentRows.length; i++) {
    intervals.push(
      (recentRows[i - 1].date.valueOf() - recentRows[i].date.valueOf()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const avgInterval = intervals.reduce(function sumIntervals(a: number, b: number): number {
    return a + b;
  }, 0) / intervals.length;

  if (avgInterval < 40) {
    return 12;
  }

  if (avgInterval < 120) {
    return 4;
  }

  return 1;
}

export async function getDistributions(symbol: string): Promise<DistributionResult | undefined> {
  await enforceRateLimit();
  lastRequestTime = Date.now();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);
  const url = buildRequestUrl(symbol, oneYearAgo, today);

  try {
    const response = await axios.get(url, {
      headers: createRequestHeaders(symbol),
    });

    const responseData = response.data as { Data?: DistributionRow[] } | undefined;
    const data = responseData?.Data ?? [];
    if (data.length === 0) {
      return undefined;
    }

    const rows = processDistributionData(data);
    const nextOrRecent = findNextOrRecentDistribution(rows, today);
    const perYear = calculateDistributionsPerYear(rows, today);

    return {
      distribution: nextOrRecent.amount,
      ex_date: nextOrRecent.date,
      distributions_per_year: perYear,
    };
  } catch {
    return {
      distribution: 0,
      ex_date: new Date(),
      distributions_per_year: 0,
    };
  }
}
