import { FastifyInstance } from 'fastify';

import { generateCSRFTokenHandler } from '../../middleware/generate-csrf-token-handler.function';
import { handleClearCookies } from './handle-clear-cookies.function';
import { handleRevokeToken } from './handle-revoke-token.function';
import { handleSetSecureCookie } from './handle-set-secure-cookie.function';

export default function authRoutes(fastify: FastifyInstance): void {
  // CSRF token endpoint
  fastify.get('/auth/csrf-token', generateCSRFTokenHandler);

  // Secure cookie management
  fastify.post('/auth/set-secure-cookie', handleSetSecureCookie);
  fastify.post('/auth/clear-cookies', handleClearCookies);

  // Token revocation
  fastify.post('/auth/revoke-token', handleRevokeToken);
}
