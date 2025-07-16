import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';

export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}

export interface NewTrade {
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}

export default async function (fastify: FastifyInstance): Promise<void> {
  // POST /api/trades - fetch trades by IDs
  fastify.post<{ Body: string[]; Reply: Trade[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<Trade[]> {
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }
      const trades = await prisma.trades.findMany({
        where: { id: { in: ids } },
      });
      return trades.map((trade) => ({
        id: trade.id,
        universeId: trade.universeId,
        accountId: trade.accountId,
        buy: trade.buy,
        sell: trade.sell,
        buy_date: trade.buy_date.toISOString(),
        sell_date: trade.sell_date?.toISOString(),
        quantity: trade.quantity,
      }));
    }
  );

  // POST /api/trades/add - add a new trade
  fastify.post<{ Body: NewTrade; Reply: Trade[] }>('/add',
    async function (request, reply): Promise<void> {
      const result = await prisma.trades.create({
        data: {
          universeId: request.body.universeId,
          accountId: request.body.accountId,
          buy: request.body.buy,
          sell: request.body.sell,
          buy_date: new Date(request.body.buy_date),
          sell_date: request.body.sell_date ? new Date(request.body.sell_date) : undefined,
          quantity: request.body.quantity,
        },
      });
      const trade = await prisma.trades.findMany({
        where: { id: { in: [result.id] } },
      });
      reply.status(200).send(trade.map((t) => ({
        id: t.id,
        universeId: t.universeId,
        accountId: t.accountId,
        buy: t.buy,
        sell: t.sell,
        buy_date: t.buy_date.toISOString(),
        sell_date: t.sell_date?.toISOString(),
        quantity: t.quantity,
      })));
    }
  );

  // DELETE /api/trades/:id - delete a trade
  fastify.delete<{ Params: { id: string }; Reply: void }>('/:id',
    async function (request, reply): Promise<void> {
      const { id } = request.params;
      await prisma.trades.delete({ where: { id } });
      reply.status(200).send();
    }
  );

  // PUT /api/trades - update a trade
  fastify.put<{ Body: Trade; Reply: Trade[] }>('/',
    async function (request, reply): Promise<void> {
      const { id, universeId, accountId, buy, sell, buy_date, sell_date, quantity } = request.body;
      await prisma.trades.update({
        where: { id },
        data: {
          universeId,
          accountId,
          buy,
          sell,
          buy_date: new Date(buy_date),
          sell_date: sell_date ? new Date(sell_date) : undefined,
          quantity,
        },
      });
      const trades = await prisma.trades.findMany({
        where: { id },
      });
      reply.status(200).send(trades.map((t) => ({
        id: t.id,
        universeId: t.universeId,
        accountId: t.accountId,
        buy: t.buy,
        sell: t.sell,
        buy_date: t.buy_date.toISOString(),
        sell_date: t.sell_date?.toISOString(),
        quantity: t.quantity,
      })));
    }
  );
}
