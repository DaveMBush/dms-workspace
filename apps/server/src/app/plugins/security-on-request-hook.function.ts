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

  // Apply CSRF protection for state-changing requests.
  if (shouldEnforceCsrfProtection(request)) {
    await csrfProtectionHook(request, reply);
  }
}

// Skipped when the server is bound to loopback (the desktop app): cross-site
// requests can't reach it, and SameSite=strict cookies already block cookie
// theft via third-party pages. The client only sends X-CSRF-Token on auth
// endpoints, so enforcing here would 403 every data mutation in production mode.
function shouldEnforceCsrfProtection(request: FastifyRequest): boolean {
  const host = process.env.HOST ?? 'localhost';
  return (
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    process.env.NODE_ENV === 'production' &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  );
}
