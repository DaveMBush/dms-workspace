import { logger } from '../../../utils/structured-logger';
import type { ProcessedRow } from './distribution-api.function';

/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related dividend history service functions */

// Global rate limiting - track last API call time
let lastDividendHistoryCallTime = 0;
// 10-second minimum gap between requests — intentionally human-paced to respect
// dividendhistory.net fair-use expectations and avoid automated-access detection.
const DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000;

const BASE_URL = 'https://dividendhistory.net';

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

interface ParsedDividendRow {
  exDiv: string; // column 0: MM/DD/YYYY format
  payDay: string; // column 3: payout date
  payout: number; // column 5: dollar amount like "$0.05000"
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
): Promise<ParsedDividendRow[] | null> {
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
  return parseDividendTable(html);
}

function parseCellValues(cells: string): string[] {
  const cellValues: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRegex.exec(cells)) !== null) {
    // eslint-disable-next-line sonarjs/slow-regex -- safe: [^>]+ is bounded by > and cannot catastrophically backtrack
    const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
    cellValues.push(text);
  }
  return cellValues;
}

function parseTableRows(tableContent: string): ParsedDividendRow[] {
  const rows: ParsedDividendRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
    const cells = rowMatch[1];
    if (/<th/i.test(cells)) {
      continue;
    }

    const cellValues = parseCellValues(cells);
    if (cellValues.length < 6) {
      continue;
    }

    const exDiv = cellValues[0];
    const payDay = cellValues[3];
    const payoutStr = cellValues[5].replace(/[$,]/g, '');
    const payout = parseFloat(payoutStr);

    if (!exDiv || isNaN(payout)) {
      continue;
    }

    rows.push({ exDiv, payDay, payout });
  }

  return rows;
}

function parseDividendTable(html: string): ParsedDividendRow[] | null {
  const tableRegex =
    /<table[^>]*class="[^"]*table[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  const rows: ParsedDividendRow[] = [];
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    rows.push(...parseTableRows(tableMatch[1]));
  }

  return rows.length > 0 ? rows : null;
}

function mapToProcessedRow(row: ParsedDividendRow): ProcessedRow {
  const [month, day, year] = row.exDiv.split('/').map(Number);
  return {
    amount: row.payout,
    date: new Date(year, month - 1, day),
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
  const url = `${BASE_URL}/${encodeURIComponent(
    upperTicker.toLowerCase()
  )}-dividend-yield`;

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
