import type { FastifyPluginAsync } from 'fastify';

import { logger } from '../../../../utils/structured-logger';
import { yahooFinance } from '../../settings/yahoo-finance.instance';

interface SymbolOption {
  symbol: string;
  name: string;
}

interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

function getSymbolName(quote: YahooSearchResult): string {
  const shortNameValid =
    quote.shortname !== null &&
    quote.shortname !== undefined &&
    quote.shortname.length > 0;
  if (shortNameValid) {
    return quote.shortname!;
  }

  const longNameValid =
    quote.longname !== null &&
    quote.longname !== undefined &&
    quote.longname.length > 0;
  if (longNameValid) {
    return quote.longname!;
  }

  return quote.symbol;
}

function filterEquityOrETF(quote: YahooSearchResult): boolean {
  return quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF';
}

function mapToSymbolOption(quote: YahooSearchResult): SymbolOption {
  return {
    symbol: quote.symbol,
    name: getSymbolName(quote),
  };
}

const symbolSearchRoute: FastifyPluginAsync = async function symbolSearchRoute(
  fastify
): Promise<void> {
  await Promise.resolve(
    fastify.get<{
      Querystring: { query: string };
    }>('/search', async function handleSymbolSearch(request, reply): Promise<
      SymbolOption[]
    > {
      const { query } = request.query;

      if (!query || query.trim().length === 0) {
        void reply.code(400).send({ error: 'Query parameter is required' });
        return [];
      }

      try {
        const searchResults = (await yahooFinance.search(query, {
          quotesCount: 20,
          newsCount: 0,
        })) as { quotes?: YahooSearchResult[] };

        const quotesArray = searchResults.quotes ?? ([] as YahooSearchResult[]);
        const symbols: SymbolOption[] = quotesArray
          .filter(filterEquityOrETF)
          .map(mapToSymbolOption)
          .slice(0, 10);

        logger.debug('Symbol search completed', {
          query,
          resultCount: symbols.length,
        });

        void reply.send(symbols);
        return symbols;
      } catch (error: unknown) {
        logger.error('Symbol search failed', undefined, {
          query,
          error: error instanceof Error ? error.message : String(error),
        });

        void reply
          .code(500)
          .send({ error: 'Failed to search symbols. Please try again.' });
        return [];
      }
    })
  );
};

export default symbolSearchRoute;
