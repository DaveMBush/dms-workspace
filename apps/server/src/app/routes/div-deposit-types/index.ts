import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';
import { DivDepositType } from './div-deposits-type.interface';

export default async function (fastify: FastifyInstance): Promise<void> {
  // Route to fetch universes by IDs
  // Path: POST /api/universe
  fastify.post<{ Body: string[]; Reply: DivDepositType[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<DivDepositType[]> {
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }
      const divDepositTypes = await prisma.divDepositType.findMany({
        where: { id: { in: ids } }
      });
      return divDepositTypes.map((u) => ({
        id: u.id,
        name: u.name
      }));
    }
  );
}
