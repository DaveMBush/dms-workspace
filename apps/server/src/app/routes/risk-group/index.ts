import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { RiskGroup } from './risk-group.interface';

export default function registerRiskGroupRoutes(
  fastify: FastifyInstance
): void {
  // Route to fetch risk groups by IDs
  // Path: POST /api/risk-group
  fastify.post<{ Body: string[]; Reply: RiskGroup[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleRiskGroupRequest(request, _): Promise<RiskGroup[]> {
      const ids = request.body;
      if (ids.length === 0) {
        return [];
      }
      const riskGroups = await prisma.risk_group.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      return riskGroups.map(function mapRiskGroup(group) {
        return {
          ...group,
        };
      });
    }
  );
}
