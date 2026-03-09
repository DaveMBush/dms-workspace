import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';

const VALID_SORT_FIELDS = [
  'symbol',
  'openDate',
  'currentValue',
  'unrealizedGain',
] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

interface SortQuerystring {
  sortBy?: string;
  sortOrder?: string;
}

interface TradeWithUniverse {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  quantity: number;
  buy_date: Date;
  universe: {
    symbol: string;
    last_price: number;
  };
}

interface OpenTradeResponse {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  quantity: number;
  buy_date: string;
  currentValue: number;
  unrealizedGain: number;
}

function isValidSortField(field: string): field is SortField {
  return (VALID_SORT_FIELDS as readonly string[]).includes(field);
}

function mapToResponse(trade: TradeWithUniverse): OpenTradeResponse {
  const currentValue = trade.universe.last_price * trade.quantity;
  const unrealizedGain =
    (trade.universe.last_price - trade.buy) * trade.quantity;
  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    symbol: trade.universe.symbol,
    buy: trade.buy,
    quantity: trade.quantity,
    buy_date: trade.buy_date.toISOString(),
    currentValue,
    unrealizedGain,
  };
}

function compareResponses(
  a: OpenTradeResponse,
  b: OpenTradeResponse,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc'
): number {
  let diff: number;
  switch (sortBy) {
    case 'symbol':
      diff = a.symbol.localeCompare(b.symbol);
      break;
    case 'openDate':
      diff = new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime();
      break;
    case 'currentValue':
      diff = a.currentValue - b.currentValue;
      break;
    case 'unrealizedGain':
    default:
      diff = a.unrealizedGain - b.unrealizedGain;
      break;
  }
  return sortOrder === 'desc' ? -diff : diff;
}

export default function registerGetOpenTrades(fastify: FastifyInstance): void {
  fastify.get<{ Querystring: SortQuerystring }>(
    '/open',
    async function handleGetOpenTrades(request, reply): Promise<void> {
      const { sortBy, sortOrder } = request.query;

      if (
        sortBy !== undefined &&
        (sortBy === '' || !isValidSortField(sortBy))
      ) {
        reply.status(400).send({
          error: `Invalid sort field: ${sortBy}. Valid fields: ${VALID_SORT_FIELDS.join(
            ', '
          )}`,
        });
        return;
      }

      const effectiveSortBy: SortField =
        sortBy !== undefined && isValidSortField(sortBy) ? sortBy : 'symbol';
      const effectiveSortOrder: 'asc' | 'desc' =
        sortOrder === 'desc' ? 'desc' : 'asc';

      const trades = await prisma.trades.findMany({
        where: { sell_date: null },
        include: { universe: true },
      });

      const responses = (trades as unknown as TradeWithUniverse[]).map(
        mapToResponse
      );
      responses.sort(function sortOpenTrades(a, b) {
        return compareResponses(a, b, effectiveSortBy, effectiveSortOrder);
      });

      reply.status(200).send(responses);
    }
  );
}
