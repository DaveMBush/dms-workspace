import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';

export default function registerTestRoutes(fastify: FastifyInstance): void {
  fastify.delete(
    '/reset',
    async function handleTestReset(_, reply): Promise<void> {
      if (process.env['NODE_ENV'] === 'production') {
        reply.status(403);
        return reply.send({ error: 'Not available in production' });
      }
      // Clear in FK-safe order: dependent tables first
      await prisma.trades.deleteMany();
      await prisma.divDeposits.deleteMany();
      await prisma.screener.deleteMany();
      await prisma.universe.deleteMany();
      return reply.send({
        cleared: ['trades', 'divDeposits', 'screener', 'universe'],
      });
    }
  );
}
