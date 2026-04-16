import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';

export default function registerTestRoutes(fastify: FastifyInstance): void {
  fastify.delete(
    '/reset',
    async function handleTestReset(_, reply): Promise<void> {
      const env = process.env['NODE_ENV'];
      const allowedEnvs = ['development', 'test', 'local'];
      if (env === undefined || !allowedEnvs.includes(env)) {
        reply.status(403);
        return reply.send({ error: 'Not available in this environment' });
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
