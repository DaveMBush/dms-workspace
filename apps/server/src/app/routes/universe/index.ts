import { FastifyInstance } from 'fastify';
import { recalculateUniverseVolatility } from '../../volatility/recalculate-universe-volatility.function';
import { getTableState } from '../common/get-table-state.function';
import { parseSortFilterHeader } from '../common/parse-sort-filter-header.function';
import registerAddSymbol from './add-symbol';
import { addSymbol } from './add-symbol/add-symbol.function';
import { sendUniverseFailure } from './error-mapper.function.ts';
import registerGetAllUniverses from './get-all-universes';
import registerSyncFromScreener from './sync-from-screener';
import { Universe } from './universe.interface';
import {
  deleteUniverseAndTrades,
  fetchHistoryForSymbol,
  fetchUniverseById,
  fetchUniversesForIds,
  fetchUpdatedUniverse,
  mapUniverseToResponse,
  universeFromAddResult,
  updateUniverseData,
} from './universe.service';

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

      const universes = await fetchUniversesForIds(ids, accountId);
      return universes.map(function mapUniverse(u) {
        return mapUniverseToResponse(u);
      });
    },
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
      const universe = universeFromAddResult(result);
      reply.status(200).send([mapUniverseToResponse(universe)]);
    },
  );
}

function handleDeleteUniverseRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async function handleDeleteUniverse(request, reply): Promise<void> {
      const { id } = request.params;
      try {
        const universe = await fetchUniverseById(id);
        if (!universe) {
          sendUniverseFailure(reply, 404, {
            success: false,
            error: 'Universe entry not found',
          });
          return;
        }
        if (universe.is_closed_end_fund) {
          sendUniverseFailure(reply, 400, {
            success: false,
            error: 'Cannot delete CEF symbols',
          });
          return;
        }
        const errorMsg = await deleteUniverseAndTrades(id);
        if (errorMsg !== null) {
          sendUniverseFailure(reply, 400, { success: false, error: errorMsg });
          return;
        }
        reply
          .status(200)
          .send({ success: true, message: 'Symbol deleted successfully' });
      } catch {
        sendUniverseFailure(reply, 500, {
          success: false,
          error: 'Internal server error',
        });
      }
    },
  );
}

function handleUpdateUniverseRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: Universe; Reply: Universe[] }>(
    '/',
    async function handleUpdateUniverse(request, reply): Promise<void> {
      const { id, ...updateData } = request.body;

      await updateUniverseData(id, updateData);

      const updateHistory = await fetchHistoryForSymbol(updateData.symbol, id);
      await recalculateUniverseVolatility(id, updateHistory);
      const universes = await fetchUpdatedUniverse(id);

      const result = universes.map(mapUniverseToResponse);

      reply.status(200).send(result);
    },
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
