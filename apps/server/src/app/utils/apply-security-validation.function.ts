import { FastifyReply, FastifyRequest } from 'fastify';

import { validateCSRFToken } from '../middleware/validate-csrf-token.function';
import { applyRateLimitingWithValidation } from './apply-rate-limiting.function';

export async function applySecurityValidation(
  request: FastifyRequest,
  reply: FastifyReply,
  rateLimitType:
    | 'general'
    | 'login'
    | 'passwordReset'
    | 'tokenRefresh' = 'general'
): Promise<boolean> {
  // Apply rate limiting
  const isRateLimited = await applyRateLimitingWithValidation(
    request,
    reply,
    rateLimitType
  );
  if (isRateLimited) {
    return true; // Request blocked - response already sent
  }

  // Validate CSRF token
  return validateCSRFToken(request, reply);
}
