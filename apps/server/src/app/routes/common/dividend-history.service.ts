import { logger } from '../../../utils/structured-logger';
import type { ProcessedRow } from './distribution-api.function';

/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related dividend history service functions */

// Global rate limiting - track last API call time
let lastDividendHistoryCallTime = 0;
// 10-second minimum gap between requests — intentionally human-paced to respect
// dividendhistory.net fair-use expectations and avoid automated-access detection.
const DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000;

const BASE_URL = 'https://dividendhistory.net/payout';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
    'image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://dividendhistory.net/',
} as const;

interface DividendHistoryRow {
  ex_div: string;
  payday: string;
  payout: number;
  type: string;
  currency: string;
  pctChange: number | string;
}

export async function enforceDividendHistoryRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastDividendHistoryCallTime;

  if (timeSinceLastCall < DIVIDEND_HISTORY_RATE_LIMIT_DELAY) {
    const waitTime = DIVIDEND_HISTORY_RATE_LIMIT_DELAY - timeSinceLastCall;
    // eslint-disable-next-line no-restricted-syntax -- Promise
    await new Promise(function rateLimitPromise(resolve) {
      setTimeout(resolve, waitTime);
    });
  }
}

export function updateDividendHistoryCallTime(): void {
  lastDividendHistoryCallTime = Date.now();
}

async function fetchAndParseHtml(
  url: string,
  upperTicker: string
): Promise<DividendHistoryRow[] | null> {
  const response = await fetch(url, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    logger.warn(
      `dividendhistory.net returned ${String(
        response.status
      )} for ticker ${upperTicker}`,
      { ticker: upperTicker, status: response.status }
    );
    return null;
  }
  const html = await response.text();
  return extractDividendJson(html);
}

function extractDividendJson(html: string): DividendHistoryRow[] | null {
  const scriptRegex =
    /<script[^>]+data-dividend-chart-json[^>]*>([\s\S]*?)<\/script>/;
  const match = scriptRegex.exec(html);
  if (!match) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return Array.isArray(parsed) ? (parsed as DividendHistoryRow[]) : null;
  } catch {
    return null;
  }
}

function mapToProcessedRow(row: DividendHistoryRow): ProcessedRow {
  return {
    amount: row.payout,
    date: new Date(row.ex_div),
  };
}

function isValidProcessedRow(row: ProcessedRow): boolean {
  return !isNaN(row.date.valueOf()) && row.amount > 0;
}

export async function fetchDividendHistory(
  ticker: string
): Promise<ProcessedRow[]> {
  await enforceDividendHistoryRateLimit();
  updateDividendHistoryCallTime();

  const upperTicker = ticker.toUpperCase();
  const url = `${BASE_URL}/${encodeURIComponent(upperTicker)}/`;

  try {
    logger.debug(
      `Fetching dividend history for ${upperTicker} from dividendhistory.net`,
      {
        ticker: upperTicker,
        url,
      }
    );

    const rawRows = await fetchAndParseHtml(url, upperTicker);

    if (!rawRows || rawRows.length === 0) {
      logger.warn(
        `No dividend data found on dividendhistory.net for ticker ${upperTicker}`,
        { ticker: upperTicker }
      );
      return [];
    }

    const processed = rawRows
      .filter(function filterConfirmedRows(row: DividendHistoryRow): boolean {
        return row.type !== 'u';
      })
      .map(mapToProcessedRow)
      .filter(isValidProcessedRow)
      .sort(function sortByDate(a: ProcessedRow, b: ProcessedRow): number {
        return a.date.valueOf() - b.date.valueOf();
      });

    logger.debug(
      `Found ${processed.length.toString()} dividend entries for ${upperTicker} from dividendhistory.net`,
      { ticker: upperTicker, count: processed.length }
    );

    return processed;
  } catch (error) {
    logger.warn(
      `Error fetching dividend history for ${upperTicker} from dividendhistory.net`,
      { ticker: upperTicker, error: String(error) }
    );
    return [];
  }
}
