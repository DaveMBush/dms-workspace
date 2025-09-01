import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';

interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}

interface TradeWithDates {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: Date;
  sell_date?: Date | null;
  quantity: number;
}

interface NewTrade {
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}

function mapTradeToResponse(trade: TradeWithDates): Trade {
  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    buy: trade.buy,
    sell: trade.sell,
    buy_date: trade.buy_date.toISOString(),
    sell_date: trade.sell_date?.toISOString(),
    quantity: trade.quantity,
  };
}

function handleGetTradesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: Trade[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetTrades(request, _): Promise<Trade[]> {
      const ids = request.body;
      if (ids === null || ids === undefined || ids.length === 0) {
        return [];
      }
      const trades = await prisma.trades.findMany({
        where: { id: { in: ids } },
      });
      return trades.map(function mapTrade(trade) {
        return mapTradeToResponse(trade);
      });
    }
  );
}

function handleAddTradeRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: NewTrade; Reply: Trade[] }>(
    '/add',
    async function handleAddTrade(request, reply): Promise<void> {
      const result = await prisma.trades.create({
        data: {
          universeId: request.body.universeId,
          accountId: request.body.accountId,
          buy: request.body.buy,
          sell: request.body.sell,
          buy_date: new Date(request.body.buy_date),
          sell_date:
            request.body.sell_date !== null &&
            request.body.sell_date !== undefined
              ? new Date(request.body.sell_date)
              : undefined,
          quantity: request.body.quantity,
        },
      });
      const trade = await prisma.trades.findMany({
        where: { id: { in: [result.id] } },
      });
      reply.status(200).send(
        trade.map(function mapCreatedTrade(t) {
          return mapTradeToResponse(t);
        })
      );
    }
  );
}

function handleDeleteTradeRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async function handleDeleteTrade(request, reply): Promise<void> {
      const { id } = request.params;
      await prisma.trades.delete({ where: { id } });
      reply.status(200).send();
    }
  );
}

function handleUpdateTradeRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: Trade; Reply: Trade[] }>(
    '/',
    async function handleUpdateTrade(request, reply): Promise<void> {
      const {
        id,
        universeId,
        accountId,
        buy,
        sell,
        buy_date,
        sell_date,
        quantity,
      } = request.body;
      await prisma.trades.update({
        where: { id },
        data: {
          universeId,
          accountId,
          buy,
          sell,
          buy_date: new Date(buy_date),
          sell_date:
            sell_date !== null && sell_date !== undefined
              ? new Date(sell_date)
              : undefined,
          quantity,
        },
      });
      const trades = await prisma.trades.findMany({
        where: { id },
      });
      reply.status(200).send(
        trades.map(function mapUpdatedTrade(t) {
          return mapTradeToResponse(t);
        })
      );
    }
  );
}

export default function registerTradeRoutes(fastify: FastifyInstance): void {
  handleGetTradesRoute(fastify);
  handleAddTradeRoute(fastify);
  handleDeleteTradeRoute(fastify);
  handleUpdateTradeRoute(fastify);
}
