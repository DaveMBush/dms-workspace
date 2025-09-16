import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLogService } from '../services/audit-log-service.instance';

export async function securityStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { getRateLimitStats } = await import(
    '../middleware/get-rate-limit-stats.function.js'
  );
  const { getCSRFStats } = await import(
    '../middleware/get-csrf-stats.function.js'
  );
  const { getBlacklistStats } = await import(
    '../routes/auth/get-blacklist-stats.function.js'
  );

  const rateLimits = (getRateLimitStats as () => Record<string, unknown>)();
  const csrf = (getCSRFStats as () => Record<string, unknown>)();
  const tokenBlacklist = (getBlacklistStats as () => Record<string, unknown>)();

  const stats = {
    rateLimits,
    csrf,
    tokenBlacklist,
    auditLog: auditLogService.getStats(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  await reply.send(stats);
}
