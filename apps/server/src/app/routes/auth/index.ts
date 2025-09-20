import { FastifyInstance } from 'fastify';

import { generateCSRFTokenHandler } from '../../middleware/generate-csrf-token-handler.function';
import { handleClearCookies } from './handle-clear-cookies.function';
import { handleRevokeToken } from './handle-revoke-token.function';
import { handleSetSecureCookie } from './handle-set-secure-cookie.function';

export default function authRoutes(fastify: FastifyInstance): void {
  // CSRF token endpoint
  fastify.get('/csrf-token', generateCSRFTokenHandler);

  // Secure cookie management
  fastify.post('/set-secure-cookie', handleSetSecureCookie);
  fastify.post('/clear-cookies', handleClearCookies);

  // Token revocation
  fastify.post('/revoke-token', handleRevokeToken);
}
