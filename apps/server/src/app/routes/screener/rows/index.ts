import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { Screen } from './screen.interface';

interface ScreenerSelect {
  id: string;
  symbol: string;
  risk_group: {
    name: string;
  };
}

function mapScreenerToScreen(s: ScreenerSelect): Screen {
  return {
    id: s.id,
    symbol: s.symbol,
    risk_group: s.risk_group.name,
  };
}

async function handleGetScreenerRequest(request: {
  body: string[];
}): Promise<Screen[]> {
  const ids = request.body;
  if (ids.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.screener
    .findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        symbol: true,
        risk_group: {
          select: {
            name: true,
          },
        },
      },
    })
    .then(function mapScreenerResults(screen: ScreenerSelect[]): Screen[] {
      return screen.map(mapScreenerToScreen);
    });
}

export default function registerScreenerRoutes(fastify: FastifyInstance): void {
  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.post<{ Body: string[]; Reply: Screen[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handlePostRequest(request, _): Promise<Screen[]> {
      return handleGetScreenerRequest(request);
    }
  );
}
