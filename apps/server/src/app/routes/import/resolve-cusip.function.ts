import { resolveCusipViaThirteenf } from '../../../utils/thirteenf-cusip.service';
import { yahooFinance } from '../../routes/settings/yahoo-finance.instance';
import { cusipCacheService } from './cusip-cache.service';
import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { isCusip } from './is-cusip.function';

/**
 * Attempts to resolve a single CUSIP via 13f.info, catching errors.
 */
async function tryResolveSingleCusip(
  cusip: string,
  result: Map<string, string>
): Promise<void> {
  try {
    const ticker = await resolveCusipViaThirteenf(cusip);
    if (ticker !== null) {
      result.set(cusip, ticker);
    }
  } catch {
    // 13f.info unavailable — skip this CUSIP
  }
}

/**
 * Looks up CUSIPs via 13f.info one at a time (rate-limited to 1 req/sec).
 * Returns a map of CUSIP → ticker for resolved CUSIPs.
 */
async function lookupCusipsViaThirteenf(
  cusips: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const cusip of cusips) {
    await tryResolveSingleCusip(cusip, result);
  }

  return result;
}

interface YahooSearchQuote {
  symbol: string;
  quoteType?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

/**
 * Fallback: searches Yahoo Finance by security description to find the ticker.
 * Filters for EQUITY or ETF quote types to avoid matching indices or futures.
 */
async function searchByDescription(
  description: string
): Promise<string | null> {
  try {
    const searchResults = (await yahooFinance.search(description, {
      quotesCount: 5,
      newsCount: 0,
    })) as YahooSearchResponse;

    const quotes = searchResults.quotes ?? [];
    const equityOrEtf = quotes.find(function isEquityOrEtf(q) {
      return q.quoteType === 'EQUITY' || q.quoteType === 'ETF';
    });
    if (equityOrEtf) {
      return equityOrEtf.symbol;
    }
    // Fall back to first result if no EQUITY/ETF match
    if (quotes.length > 0 && quotes[0].symbol.length > 0) {
      return quotes[0].symbol;
    }
  } catch {
    // Yahoo Finance unavailable
  }
  return null;
}

/**
 * Attempts Yahoo Finance description-based resolution for a single CUSIP.
 * Returns true if the CUSIP was successfully resolved.
 */
async function tryYahooFallback(
  cusip: string,
  description: string,
  resolved: Map<string, string>
): Promise<boolean> {
  if (resolved.has(cusip) || description.length === 0) {
    return false;
  }
  const ticker = await searchByDescription(description);
  if (ticker !== null) {
    resolved.set(cusip, ticker);
    return true;
  }
  return false;
}

/**
 * Fallback pass: attempts Yahoo Finance resolution for all unresolved CUSIPs.
 */
async function resolveViaYahooFallback(
  cusipDescriptions: Map<string, string>,
  resolved: Map<string, string>
): Promise<void> {
  for (const [cusip, description] of cusipDescriptions) {
    try {
      await tryYahooFallback(cusip, description, resolved);
    } catch {
      // Fallback failed — keep original CUSIP
    }
  }
}

/**
 * Collects unique CUSIP symbols and their descriptions from rows.
 */
function collectCusips(rows: FidelityCsvRow[]): Map<string, string> {
  const cusipDescriptions = new Map<string, string>();
  for (const row of rows) {
    if (isCusip(row.symbol) && !cusipDescriptions.has(row.symbol)) {
      cusipDescriptions.set(row.symbol, row.description);
    }
  }
  return cusipDescriptions;
}

/**
 * Applies resolved CUSIP→ticker mappings back onto rows.
 */
function applyResolved(
  rows: FidelityCsvRow[],
  resolved: Map<string, string>
): void {
  for (const row of rows) {
    const ticker = resolved.get(row.symbol);
    if (ticker !== undefined) {
      row.symbol = ticker;
    }
  }
}

/**
 * Builds a descriptions map for CUSIPs that are not yet resolved.
 */
function buildUnresolvedDescriptions(
  uncachedCusips: string[],
  resolved: Map<string, string>,
  cusipDescriptions: Map<string, string>
): Map<string, string> {
  const unresolvedDescriptions = new Map<string, string>();
  for (const cusip of uncachedCusips) {
    if (!resolved.has(cusip)) {
      unresolvedDescriptions.set(cusip, cusipDescriptions.get(cusip) ?? '');
    }
  }
  return unresolvedDescriptions;
}

/**
 * Collects newly resolved mappings from Yahoo Finance fallback.
 */
function collectYahooMappings(
  resolved: Map<string, string>,
  resolvedBeforeYahoo: Set<string>
): Array<{
  cusip: string;
  symbol: string;
  source: 'THIRTEENF' | 'YAHOO_FINANCE';
}> {
  const yahooMappings: Array<{
    cusip: string;
    symbol: string;
    source: 'THIRTEENF' | 'YAHOO_FINANCE';
  }> = [];
  for (const [cusip, symbol] of resolved) {
    if (!resolvedBeforeYahoo.has(cusip)) {
      yahooMappings.push({ cusip, symbol, source: 'YAHOO_FINANCE' });
    }
  }
  return yahooMappings;
}

/**
 * Resolves CUSIP identifiers in parsed CSV rows to proper ticker symbols.
 * Strategy: Check cache first, then 13f.info lookup, then Yahoo Finance fallback.
 * Rows with unresolvable CUSIPs keep their original symbol.
 *
 * @param rows - Parsed CSV rows (mutated in place)
 */
export async function resolveCusipSymbols(
  rows: FidelityCsvRow[]
): Promise<void> {
  const cusipDescriptions = collectCusips(rows);

  if (cusipDescriptions.size === 0) {
    return;
  }

  const allCusips = [...cusipDescriptions.keys()];

  // Check cache first
  const cached = await cusipCacheService.findManyCusips(allCusips);

  // Filter out cached CUSIPs from API calls
  const uncachedCusips = allCusips.filter(function isUncached(c) {
    return !cached.has(c);
  });

  // Start with cached results
  const resolved = new Map<string, string>(cached);

  if (uncachedCusips.length > 0) {
    // Look up uncached CUSIPs via 13f.info
    const apiResolved = await lookupCusipsViaThirteenf(uncachedCusips);

    // Cache 13f.info results
    const thirteenfMappings = [...apiResolved.entries()].map(
      function toMapping([cusip, symbol]) {
        return { cusip, symbol, source: 'THIRTEENF' as const };
      }
    );
    await cusipCacheService.upsertManyMappings(thirteenfMappings);

    // Merge API results into resolved map
    for (const [cusip, symbol] of apiResolved) {
      resolved.set(cusip, symbol);
    }

    // Yahoo Finance fallback for still-unresolved CUSIPs
    const unresolvedDescriptions = buildUnresolvedDescriptions(
      uncachedCusips,
      resolved,
      cusipDescriptions
    );

    const resolvedBeforeYahoo = new Set(resolved.keys());
    await resolveViaYahooFallback(unresolvedDescriptions, resolved);

    // Cache Yahoo Finance results
    const yahooMappings = collectYahooMappings(resolved, resolvedBeforeYahoo);
    await cusipCacheService.upsertManyMappings(yahooMappings);
  }

  applyResolved(rows, resolved);
}
