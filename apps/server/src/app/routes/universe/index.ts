import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import registerAddSymbol from './add-symbol';
import { addSymbol } from './add-symbol/add-symbol.function';
import registerGetAllUniverses from './get-all-universes';
import registerSyncFromScreener from './sync-from-screener';
import { Universe } from './universe.interface';
import universeHelpers from './universe-helpers';

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

function mapUniverseToResponse(u: UniverseWithTrades): Universe {
  const openTrades = universeHelpers.getOpenTrades(u.trades);
  const mostRecentSell = universeHelpers.getMostRecentSell(u.trades);
  return {
    id: u.id,
    distribution: u.distribution,
    distributions_per_year: u.distributions_per_year,
    last_price: u.last_price,
    most_recent_sell_date: mostRecentSell?.sell_date.toISOString() ?? null,
    most_recent_sell_price: mostRecentSell?.sell ?? null,
    symbol: u.symbol,
    ex_date: u.ex_date?.toISOString() ?? '',
    risk_group_id: u.risk_group_id,
    position: universeHelpers.calculatePosition(openTrades),
    expired: u.expired,
    is_closed_end_fund: u.is_closed_end_fund,
    avg_purchase_yield_percent:
      universeHelpers.calculateAvgPurchaseYieldPercent(
        openTrades,
        u.distribution,
        u.distributions_per_year
      ),
  };
}

function handleGetUniversesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: Universe[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetUniverses(request, _): Promise<Universe[]> {
      const ids = request.body;
      if (ids === null || ids === undefined || ids.length === 0) {
        return [];
      }
      // Check if an account filter is set to scope computed fields
      const allState = parseSortFilterHeader(request);
      const universeState = getTableState(allState, 'universes');
      const accountId =
        universeState.filters !== undefined &&
        typeof universeState.filters['account_id'] === 'string'
          ? universeState.filters['account_id']
          : null;

      const universes = await prisma.universe.findMany({
        where: { id: { in: ids } },
        include: {
          risk_group: true,
          trades: accountId !== null ? { where: { accountId } } : true,
        },
      });
      return universes.map(function mapUniverse(u) {
        return mapUniverseToResponse(u as UniverseWithTrades);
      });
    }
  );
}

function handleAddUniverseRoute(fastify: FastifyInstance): void {
  fastify.post<{
    Body: { symbol: string; risk_group_id: string };
    Reply: Universe[];
  }>(
    '/add',
    {
      schema: {
        body: {
          type: 'object',
          required: ['symbol', 'risk_group_id'],
          properties: {
            symbol: { type: 'string' },
            risk_group_id: { type: 'string' },
          },
        },
      },
    },
    async function handleAddUniverse(request, reply): Promise<void> {
      const { symbol, risk_group_id } = request.body;
      const result = await addSymbol({ symbol, risk_group_id });
      reply.status(200).send([
        {
          id: result.id,
          distribution: result.distribution ?? 0,
          distributions_per_year: result.distributions_per_year ?? 0,
          last_price: result.last_price ?? 0,
          most_recent_sell_date: result.most_recent_sell_date,
          most_recent_sell_price: null,
          symbol: result.symbol,
          ex_date: result.ex_date ?? '',
          risk_group_id: result.risk_group_id,
          position: 0,
          expired: result.expired,
          is_closed_end_fund: result.is_closed_end_fund,
          avg_purchase_yield_percent: 0, // new symbol has no purchase history yet
        },
      ]);
    }
  );
}

function handleDeleteUniverseRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async function handleDeleteUniverse(request, reply): Promise<void> {
      const { id } = request.params;

      try {
        // Check if universe entry exists
        const universe = await prisma.universe.findUnique({
          where: { id },
        });

        if (!universe) {
          reply.status(404).send({
            success: false,
            error: 'Universe entry not found',
          });
          return;
        }

        // Verify is_closed_end_fund = false
        if (universe.is_closed_end_fund) {
          reply.status(400).send({
            success: false,
            error: 'Cannot delete CEF symbols',
          });
          return;
        }

        // Query trades table for any references to this universe_id
        const existingTrades = await prisma.trades.findMany({
          where: { universeId: id },
        });

        if (existingTrades.length > 0) {
          reply.status(400).send({
            success: false,
            error: 'Cannot delete symbols with active trades',
          });
          return;
        }

        // If validations pass, delete from universe table
        await prisma.universe.delete({ where: { id } });

        reply.status(200).send({
          success: true,
          message: 'Symbol deleted successfully',
        });
      } catch {
        // Error is handled by returning appropriate status code
        reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}

async function updateUniverseData(
  id: string,
  data: Omit<Universe, 'id'>
): Promise<unknown> {
  return prisma.universe.update({
    where: { id },
    data: {
      distribution: data.distribution,
      distributions_per_year: data.distributions_per_year,
      last_price: data.last_price,
      most_recent_sell_date: data.most_recent_sell_date,
      most_recent_sell_price: data.most_recent_sell_price,
      symbol: data.symbol,
      ex_date: data.ex_date,
      risk_group_id: data.risk_group_id,
      expired: data.expired,
    },
  });
}

async function fetchUpdatedUniverse(id: string): Promise<UniverseWithTrades[]> {
  return prisma.universe.findMany({
    where: { id },
    include: {
      trades: true,
    },
  });
}

function handleUpdateUniverseRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: Universe; Reply: Universe[] }>(
    '/',
    async function handleUpdateUniverse(request, reply): Promise<void> {
      const { id, ...updateData } = request.body;

      await updateUniverseData(id, updateData);
      const universes = await fetchUpdatedUniverse(id);

      const result = universes.map(mapUniverseToResponse);

      reply.status(200).send(result);
    }
  );
}
export default function registerUniverseRoutes(fastify: FastifyInstance): void {
  registerGetAllUniverses(fastify);
  handleGetUniversesRoute(fastify);
  handleAddUniverseRoute(fastify);
  handleDeleteUniverseRoute(fastify);
  handleUpdateUniverseRoute(fastify);
  registerAddSymbol(fastify);
  registerSyncFromScreener(fastify);
}
