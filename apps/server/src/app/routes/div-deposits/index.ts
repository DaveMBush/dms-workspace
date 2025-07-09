import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';
import { DivDeposit } from './div-deposits.interface';

export default async function (fastify: FastifyInstance): Promise<void> {
  // Route to fetch universes by IDs
  // Path: POST /api/universe
  fastify.post<{ Body: string[]; Reply: DivDeposit[] }>('/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function (request, reply): Promise<DivDeposit[]> {
      const ids = request.body;
      if (!ids || ids.length === 0) {
        return [];
      }
      const divDeposits = await prisma.divDeposits.findMany({
        where: { id: { in: ids } }
      });

      return divDeposits.map((u) => ({
        id: u.id,
        date: u.date,
        amount: u.amount,
        accountId: u.accountId,
        divDepositTypeId: u.divDepositTypeId,
        universeId: u.universeId
      }));
    }
  );

  // Add
  fastify.post<{ Body: Omit<DivDeposit, 'id' >, Reply: DivDeposit[] }>('/add',
    async function (request, reply): Promise<void> {
      const { ...rest } = request.body;
      const result = await prisma.divDeposits.create({
        data: {
          date: rest.date,
          amount: rest.amount,
          accountId: rest.accountId,
          divDepositTypeId: rest.divDepositTypeId,
          universeId: rest.universeId
        }
      });
      reply.status(200).send([
        {
          id: result.id,
          date: result.date,
          amount: result.amount,
          accountId: result.accountId,
          divDepositTypeId: result.divDepositTypeId,
          universeId: result.universeId
        },
      ]);
    }
  );

  // Delete
  fastify.delete<{ Params: { id: string }, Reply: void }>('/:id',
    async function (request, reply): Promise<void> {
      var { id } = request.params;
      await prisma.divDeposits.delete({ where: { id } });
      reply.status(200).send();
    }
  );

  // Update
  fastify.put<{ Body: DivDeposit, Reply: DivDeposit[] }>('/',
    async function (request, reply): Promise<void> {
      const { id,
        date,
        amount,
        accountId,
        divDepositTypeId,
        universeId
      } = request.body;
      await prisma.divDeposits.update({
        where: { id },
        data: {
          date,
          amount,
          accountId,
          divDepositTypeId,
          universeId
        },
      });
      const divDeposits = await prisma.divDeposits.findMany({
        where: { id }
      });
      const result = divDeposits.map((u) => ({
        id: u.id,
        date: u.date,
        amount: u.amount,
        accountId: u.accountId,
        divDepositTypeId: u.divDepositTypeId,
        universeId: u.universeId
      }));
      reply.status(200).send(result);
    }
  );
}
