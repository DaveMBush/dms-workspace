import { FastifyInstance } from 'fastify';
import { Screen } from './screen.interface';
import { prisma } from '../../../prisma/prisma-client';

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.post<{ Body: string[]; Reply: Screen[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<Screen[]> {
      console.log('HANDLER: POST /api/accounts');
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }

      const screen = await prisma.screener.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          symbol: true,
          risk_group: {
            select: {
              name: true,
            },
          },
          has_volitility: true,
          objectives_understood: true,
          graph_higher_before_2008: true,
        },
      });
      return screen.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        risk_group: s.risk_group.name,
        has_volitility: s.has_volitility,
        objectives_understood: s.objectives_understood,
        graph_higher_before_2008: s.graph_higher_before_2008,
      }));
    }
  );

  console.log('registering /api/screener/rows/ update route');
  fastify.put < {
    Body: {
      id: string,
      has_volitility: boolean,
      objectives_understood: boolean,
      graph_higher_before_2008: boolean
    }, Reply: Screen[] } > ('/',
    async function (request, reply): Promise<Screen[]> {
      var { id, has_volitility, objectives_understood, graph_higher_before_2008 } = request.body;
      await prisma.screener.update({
        where: { id },
        data: {
          has_volitility,
          objectives_understood,
          graph_higher_before_2008
        }
      });
      const screen = await prisma.screener.findMany({
        where: { id },
        select: {
          id: true,
          symbol: true,
          risk_group: {
            select: {
              name: true,
            },
          },
          has_volitility: true,
          objectives_understood: true,
          graph_higher_before_2008: true,
        },
      });
      return screen.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        risk_group: s.risk_group.name,
        has_volitility: s.has_volitility,
        objectives_understood: s.objectives_understood,
        graph_higher_before_2008: s.graph_higher_before_2008,
      }));
    }
  );
}


