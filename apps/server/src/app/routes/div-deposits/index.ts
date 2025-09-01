import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import { DivDeposit } from './div-deposits.interface';

interface DivDepositFromDb {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
}

function mapDivDepositToResponse(u: DivDepositFromDb): DivDeposit {
  return {
    id: u.id,
    date: u.date,
    amount: u.amount,
    accountId: u.accountId,
    divDepositTypeId: u.divDepositTypeId,
    universeId: u.universeId,
  };
}

function handleGetDivDepositsRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: DivDeposit[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetDivDepositsRequest(
      request,
      _
    ): Promise<DivDeposit[]> {
      const ids = request.body;
      if (ids.length === 0) {
        return [];
      }
      const divDeposits = await prisma.divDeposits.findMany({
        where: { id: { in: ids } },
      });

      return divDeposits.map(function mapDivDeposit(u) {
        return mapDivDepositToResponse(u);
      });
    }
  );
}

function handleAddDivDepositRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: Omit<DivDeposit, 'id'>; Reply: DivDeposit[] }>(
    '/add',
    async function handleAddDivDepositRequest(request, reply): Promise<void> {
      const { ...rest } = request.body;
      const result = await prisma.divDeposits.create({
        data: {
          date: rest.date,
          amount: rest.amount,
          accountId: rest.accountId,
          divDepositTypeId: rest.divDepositTypeId,
          universeId: rest.universeId,
        },
      });
      reply.status(200).send([mapDivDepositToResponse(result)]);
    }
  );
}

function handleDeleteDivDepositRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string }; Reply: { success: boolean } }>(
    '/:id',
    async function handleDeleteDivDepositRequest(
      request,
      reply
    ): Promise<{ success: boolean }> {
      const { id } = request.params;
      await prisma.divDeposits.delete({ where: { id } });
      reply.status(200).send({ success: true });
      return { success: true };
    }
  );
}

function handleUpdateDivDepositRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: DivDeposit; Reply: DivDeposit[] }>(
    '/',
    async function handleUpdateDivDepositRequest(
      request,
      reply
    ): Promise<void> {
      const { id, date, amount, accountId, divDepositTypeId, universeId } =
        request.body;
      await prisma.divDeposits.update({
        where: { id },
        data: {
          date,
          amount,
          accountId,
          divDepositTypeId,
          universeId,
        },
      });
      const divDeposits = await prisma.divDeposits.findMany({
        where: { id },
      });
      const result = divDeposits.map(function mapUpdatedDivDeposit(u) {
        return mapDivDepositToResponse(u);
      });
      reply.status(200).send(result);
    }
  );
}

export default function registerDivDepositRoutes(
  fastify: FastifyInstance
): void {
  handleGetDivDepositsRoute(fastify);
  handleAddDivDepositRoute(fastify);
  handleDeleteDivDepositRoute(fastify);
  handleUpdateDivDepositRoute(fastify);
}
