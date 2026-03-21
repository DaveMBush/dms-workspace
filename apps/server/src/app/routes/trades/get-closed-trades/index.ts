import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import {
  validateSortParams,
  type SortQuerystring,
} from '../shared/validate-sort-params';

const VALID_SORT_FIELDS = [
  'symbol',
  'closeDate',
  'profit',
  'percentGain',
] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

interface TradeWithUniverse {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  quantity: number;
  buy_date: Date;
  sell_date: Date;
  universe: {
    symbol: string;
    last_price: number;
  };
}

interface ClosedTradeResponse {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  sell: number;
  quantity: number;
  buy_date: string;
  sell_date: string;
  profit: number;
  percentGain: number;
}

function mapToResponse(trade: TradeWithUniverse): ClosedTradeResponse {
  const profit = (trade.sell - trade.buy) * trade.quantity;
  const percentGain =
    trade.buy !== 0 ? ((trade.sell - trade.buy) / trade.buy) * 100 : 0;
  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    symbol: trade.universe.symbol,
    buy: trade.buy,
    sell: trade.sell,
    quantity: trade.quantity,
    buy_date: trade.buy_date.toISOString(),
    sell_date: trade.sell_date.toISOString(),
    profit,
    percentGain,
  };
}

function compareResponses(
  a: ClosedTradeResponse,
  b: ClosedTradeResponse,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc'
): number {
  let diff: number;
  switch (sortBy) {
    case 'symbol':
      diff = a.symbol.localeCompare(b.symbol);
      break;
    case 'closeDate':
      diff = new Date(a.sell_date).getTime() - new Date(b.sell_date).getTime();
      break;
    case 'profit':
      diff = a.profit - b.profit;
      break;
    case 'percentGain':
    default:
      diff = a.percentGain - b.percentGain;
      break;
  }
  return sortOrder === 'desc' ? -diff : diff;
}

export default function registerGetClosedTrades(
  fastify: FastifyInstance
): void {
  fastify.get<{ Querystring: SortQuerystring }>(
    '/closed',
    async function handleGetClosedTrades(request, reply): Promise<void> {
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
        where: { sell_date: { not: null } },
        include: { universe: true },
      });

      const responses = (trades as unknown as TradeWithUniverse[]).map(
        mapToResponse
      );
      responses.sort(function sortClosedTrades(a, b) {
        return compareResponses(a, b, effectiveSortBy, effectiveSortOrder);
      });

      reply.status(200).send(responses);
    }
  );
}
