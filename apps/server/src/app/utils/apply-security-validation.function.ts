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
  const isCSRFValid = await validateCSRFToken(request, reply);

  // Return the result directly - if CSRF is valid (true), validations passed (false blocked)
  // If CSRF is invalid (false), request is blocked (true blocked)
  return !isCSRFValid;
}
