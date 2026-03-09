import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import universeHelpers from '../universe-helpers';

const VALID_SORT_FIELDS = ['symbol', 'name', 'sector', 'marketCap'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

interface SortQuerystring {
  sortBy?: string;
  sortOrder?: string;
}

interface UniverseWithTrades {
  id: string;
  distribution: number;
  distributions_per_year: number;
  last_price: number;
  symbol: string;
  ex_date: Date | null;
  risk_group_id: string;
  trades: Array<{
    buy: number;
    quantity: number;
    sell: number;
    sell_date: Date | null;
  }>;
  expired: boolean;
  is_closed_end_fund: boolean;
}

interface SortableUniverse {
  symbol: string;
  last_price: number;
  risk_group?: { name: string };
}

function isValidSortField(field: string): field is SortField {
  return (VALID_SORT_FIELDS as readonly string[]).includes(field);
}

function getTextSortValue(item: SortableUniverse, sortBy: SortField): string {
  switch (sortBy) {
    case 'marketCap':
      return String(item.last_price);
    case 'name':
    case 'sector':
      return item.risk_group?.name ?? '';
    case 'symbol':
    default:
      return item.symbol;
  }
}

function getNumericSortValue(
  item: SortableUniverse,
  sortBy: SortField
): number {
  switch (sortBy) {
    case 'marketCap':
      return item.last_price;
    case 'name':
    case 'sector':
    case 'symbol':
    default:
      return 0;
  }
}

function compareTextValues(aText: string, bText: string): number {
  if (aText < bText) {
    return -1;
  }
  if (aText > bText) {
    return 1;
  }
  return 0;
}

function compareUniverseItems(
  a: SortableUniverse,
  b: SortableUniverse,
  sortBy: SortField,
  sortOrder: 'asc' | 'desc'
): number {
  let diff: number;
  if (sortBy === 'marketCap') {
    diff = getNumericSortValue(a, sortBy) - getNumericSortValue(b, sortBy);
  } else {
    const aText = getTextSortValue(a, sortBy).toLowerCase();
    const bText = getTextSortValue(b, sortBy).toLowerCase();
    diff = compareTextValues(aText, bText);
  }
  return sortOrder === 'desc' ? -diff : diff;
}

function buildPrismaOrderBy(
  sortBy: SortField,
  sortOrder: 'asc' | 'desc'
): Record<string, unknown> {
  switch (sortBy) {
    case 'name':
    case 'sector':
      return { risk_group: { name: sortOrder } };
    case 'marketCap':
      return { last_price: sortOrder };
    case 'symbol':
    default:
      return { symbol: sortOrder };
  }
}

function mapUniverseToResponse(u: unknown): Record<string, unknown> {
  const uw = u as UniverseWithTrades;
  const openTrades = universeHelpers.getOpenTrades(uw.trades);
  const mostRecentSell = universeHelpers.getMostRecentSell(uw.trades);
  return {
    id: uw.id,
    distribution: uw.distribution,
    distributions_per_year: uw.distributions_per_year,
    last_price: uw.last_price,
    most_recent_sell_date: mostRecentSell?.sell_date.toISOString() ?? null,
    most_recent_sell_price: mostRecentSell?.sell ?? null,
    symbol: uw.symbol,
    ex_date: uw.ex_date?.toISOString() ?? '',
    risk_group_id: uw.risk_group_id,
    position: universeHelpers.calculatePosition(openTrades),
    expired: uw.expired,
    is_closed_end_fund: uw.is_closed_end_fund,
    avg_purchase_yield_percent:
      universeHelpers.calculateAvgPurchaseYieldPercent(
        openTrades,
        uw.distribution,
        uw.distributions_per_year
      ),
  };
}

export default function registerGetAllUniverses(
  fastify: FastifyInstance
): void {
  fastify.get<{ Querystring: SortQuerystring }>(
    '/',
    async function handleGetAllUniverses(request, reply): Promise<void> {
      const { sortBy, sortOrder } = request.query;

      if (sortBy !== undefined && !isValidSortField(sortBy)) {
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

      const universes = await prisma.universe.findMany({
        include: {
          risk_group: true,
          trades: true,
        },
        orderBy: buildPrismaOrderBy(effectiveSortBy, effectiveSortOrder),
      });

      const sorted = [...universes].sort(function sortItems(a, b) {
        return compareUniverseItems(
          a as SortableUniverse,
          b as SortableUniverse,
          effectiveSortBy,
          effectiveSortOrder
        );
      });

      reply.status(200).send(sorted.map(mapUniverseToResponse));
    }
  );
}
