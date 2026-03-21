import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import type { SortQuerystring } from '../shared/sort-types';
import { validateSortParams } from '../shared/validate-sort-params';

const VALID_SORT_FIELDS = [
  'symbol',
  'openDate',
  'currentValue',
  'unrealizedGain',
] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

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
      const validated = validateSortParams(
        request.query,
        reply,
        VALID_SORT_FIELDS,
        'symbol'
      );

      if (!validated) {
        return; // Error response already sent by validateSortParams
      }

      const { effectiveSortBy, effectiveSortOrder } = validated;

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
