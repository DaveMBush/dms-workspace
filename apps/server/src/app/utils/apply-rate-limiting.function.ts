import { FastifyReply, FastifyRequest } from 'fastify';

import { createRateLimiter } from '../middleware/enhanced-rate-limit.middleware';

export async function applyRateLimitingWithValidation(
  request: FastifyRequest,
  reply: FastifyReply,
  rateLimitType:
    | 'general'
    | 'login'
    | 'passwordReset'
    | 'tokenRefresh' = 'general'
): Promise<boolean> {
  const rateLimiter = createRateLimiter(rateLimitType);
  const isRateLimited = await rateLimiter(request, reply);

  return isRateLimited; // Return rate limiting status
}
