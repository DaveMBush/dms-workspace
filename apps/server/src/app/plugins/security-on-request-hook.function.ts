import { FastifyReply, FastifyRequest } from 'fastify';

import { csrfProtectionHook } from '../middleware/csrf-protection-hook.function';
import { securityHeaders } from '../middleware/security.middleware';

export async function securityOnRequestHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Apply security headers to all requests
  securityHeaders(request, reply);

  // Skip security checks for health endpoints and static assets
  if (
    request.url === '/health' ||
    request.url === '/ready' ||
    request.url === '/live' ||
    request.url.startsWith('/static/') ||
    request.url.startsWith('/assets/')
  ) {
    return;
  }

  // Apply CSRF protection for state-changing requests
  if (
    process.env.NODE_ENV === 'production' &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  ) {
    await csrfProtectionHook(request, reply);
  }
}
