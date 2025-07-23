import { FastifyInstance } from 'fastify';
import { Universe } from './universe.interface';
import { prisma } from '../../prisma/prisma-client';

export default async function (fastify: FastifyInstance): Promise<void> {
  // Route to fetch universes by IDs
  // Path: POST /api/universe
  fastify.post<{ Body: string[]; Reply: Universe[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<Universe[]> {
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }
      const universes = await prisma.universe.findMany({
        where: { id: { in: ids } },
        include: {
          risk_group: true,
          trades: {
            where: { sell_date: null }
          }
        },
      });
      return universes.map((u) => ({
        id: u.id,
        distribution: u.distribution,
        distributions_per_year: u.distributions_per_year,
        last_price: u.last_price,
        most_recent_sell_date: u.most_recent_sell_date?.toISOString() ?? null,
        most_recent_sell_price: u.most_recent_sell_price ?? null,
        symbol: u.symbol,
        ex_date: u.ex_date?.toISOString(),
        risk: u.risk,
        risk_group_id: u.risk_group_id,
        position: u.trades.reduce((acc, trade) => acc + trade.buy * trade.quantity, 0),
        expired: u.expired
      }));
    }
  );

  // Add
  fastify.post<{ Body: Omit<Universe, 'id' >, Reply: Universe[] }>('/add',
    async function (request, reply): Promise<void> {
      const { ...rest } = request.body;
      const result = await prisma.universe.create({
        data: {
          ...rest,
        }
      });
      reply.status(200).send([
        {
          id: result.id,
          distribution: result.distribution,
          distributions_per_year: result.distributions_per_year,
          last_price: result.last_price,
          most_recent_sell_date: result.most_recent_sell_date?.toISOString() ?? null,
          most_recent_sell_price: result.most_recent_sell_price ?? null,
          symbol: result.symbol,
          ex_date: result.ex_date.toISOString(),
          risk: result.risk,
          risk_group_id: result.risk_group_id,
          position: 0,
          expired: result.expired
        },
      ]);
    }
  );

  // Delete
  fastify.delete<{ Params: { id: string }, Reply: void }>('/:id',
    async function (request, reply): Promise<void> {
      var { id } = request.params;
      await prisma.universe.delete({ where: { id } });
      reply.status(200).send();
    }
  );

  // Update
  fastify.put<{ Body: Universe, Reply: Universe[] }>('/',
    async function (request, reply): Promise<void> {
      const { id,
        distribution,
        distributions_per_year,
        last_price,
        most_recent_sell_date,
        most_recent_sell_price,
        symbol,
        ex_date,
        risk,
        risk_group_id,
        expired
      } = request.body;
      await prisma.universe.update({
        where: { id },
        data: {
          distribution,
          distributions_per_year,
          last_price,
          most_recent_sell_date,
          most_recent_sell_price,
          symbol,
          ex_date,
          risk,
          risk_group_id,
          expired
        },
      });
      const universes = await prisma.universe.findMany({
        where: { id },
        include: {
          trades: {
            where: {
              sell_date: {
                equals: null
              }
            }
          }
        }
      });
      const result = universes.map((u) => ({
        id: u.id,
        distribution: u.distribution,
        distributions_per_year: u.distributions_per_year,
        last_price: u.last_price,
        most_recent_sell_date: u.most_recent_sell_date?.toISOString() ?? null,
        most_recent_sell_price: u.most_recent_sell_price ?? null,
        symbol: u.symbol,
        ex_date: u.ex_date.toISOString(),
        risk: u.risk,
        risk_group_id: u.risk_group_id,
        position: u.trades.reduce((acc, trade) => acc + trade.buy * trade.quantity, 0),
        expired: u.expired
      }));
      reply.status(200).send(result);
    }
  );
}
