import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';

const VALID_SORT_FIELDS = [
  'symbol',
  'closeDate',
  'profit',
  'percentGain',
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

function isValidSortField(field: string): field is SortField {
  return (VALID_SORT_FIELDS as readonly string[]).includes(field);
}

function mapToResponse(trade: TradeWithUniverse): ClosedTradeResponse {
  const profit = (trade.sell - trade.buy) * trade.quantity;
  const percentGain = ((trade.sell - trade.buy) / trade.buy) * 100;
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

function getSortValue(
  trade: ClosedTradeResponse,
  sortBy: SortField
): number | string {
  switch (sortBy) {
    case 'symbol':
      return trade.symbol;
    case 'closeDate':
      return new Date(trade.sell_date).getTime();
    case 'profit':
      return trade.profit;
    case 'percentGain':
    default:
      return trade.percentGain;
  }
}

function compareResponses(
  a: ClosedTradeResponse,
  b: ClosedTradeResponse,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc'
): number {
  const aVal = getSortValue(a, sortBy);
  const bVal = getSortValue(b, sortBy);
  let diff: number;
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    diff = aVal.localeCompare(bVal);
  } else {
    diff = (aVal as number) - (bVal as number);
  }
  return sortOrder === 'desc' ? -diff : diff;
}

export default function registerGetClosedTrades(
  fastify: FastifyInstance
): void {
  fastify.get<{ Querystring: SortQuerystring }>(
    '/closed',
    async function handleGetClosedTrades(request, reply): Promise<void> {
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
