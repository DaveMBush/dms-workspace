import { FastifyInstance } from 'fastify';
import { RiskGroup } from './risk-group.interface';
import { prisma } from '../../prisma/prisma-client';

export default async function (fastify: FastifyInstance): Promise<void> {
  // Route to fetch risk groups by IDs
  // Path: POST /api/risk-group
  fastify.post<{ Body: string[]; Reply: RiskGroup[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<RiskGroup[]> {
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }
      const riskGroups = await prisma.risk_group.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return riskGroups.map((group) => ({
        ...group,
      }));
    }
  );
}
