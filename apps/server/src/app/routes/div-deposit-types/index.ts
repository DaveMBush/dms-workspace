import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { DivDepositType } from './div-deposits-type.interface';

function mapDivDepositTypeToResponse(u: { id: string; name: string }): DivDepositType {
  return {
    id: u.id,
    name: u.name
  };
}

function handleGetDivDepositTypesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: DivDepositType[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetDivDepositTypesRequest(request, _): Promise<DivDepositType[]> {
      const ids = request.body;
      if (ids.length === 0) {
        return [];
      }
      const divDepositTypes = await prisma.divDepositType.findMany({
        where: { id: { in: ids } }
      });
      return divDepositTypes.map(function mapDivDepositType(u) {
        return mapDivDepositTypeToResponse(u);
      });
    }
  );
}

export function registerDivDepositTypeRoutes(fastify: FastifyInstance): void {
  handleGetDivDepositTypesRoute(fastify);
}
