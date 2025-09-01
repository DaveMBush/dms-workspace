import { FastifyInstance } from 'fastify';

import { prisma } from '../../../prisma/prisma-client';
import { Screen } from './screen.interface';

interface ScreenerSelect {
  id: string;
  symbol: string;
  risk_group: {
    name: string;
  };
  has_volitility: boolean;
  objectives_understood: boolean;
  graph_higher_before_2008: boolean;
}

function mapScreenerToScreen(s: ScreenerSelect): Screen {
  return {
    id: s.id,
    symbol: s.symbol,
    risk_group: s.risk_group.name,
    has_volitility: s.has_volitility,
    objectives_understood: s.objectives_understood,
    graph_higher_before_2008: s.graph_higher_before_2008,
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
        has_volitility: true,
        objectives_understood: true,
        graph_higher_before_2008: true,
      },
    })
    .then(function mapScreenerResults(screen: ScreenerSelect[]): Screen[] {
      return screen.map(mapScreenerToScreen);
    });
}

async function handleUpdateScreenerRequest(request: {
  body: {
    id: string;
    has_volitility: boolean;
    objectives_understood: boolean;
    graph_higher_before_2008: boolean;
  };
}): Promise<Screen[]> {
  const {
    id,
    has_volitility,
    objectives_understood,
    graph_higher_before_2008,
  } = request.body;

  return prisma.screener
    .update({
      where: { id },
      data: {
        has_volitility,
        objectives_understood,
        graph_higher_before_2008,
      },
    })
    .then(async function findUpdatedScreener(): Promise<ScreenerSelect[]> {
      return prisma.screener.findMany({
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
    })
    .then(function mapUpdatedResults(screen: ScreenerSelect[]): Screen[] {
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

  fastify.put<{
    Body: {
      id: string;
      has_volitility: boolean;
      objectives_understood: boolean;
      graph_higher_before_2008: boolean;
    };
    Reply: Screen[];
  }>('/', async function handlePutRequest(request, _): Promise<Screen[]> {
    return handleUpdateScreenerRequest(request);
  });
}
