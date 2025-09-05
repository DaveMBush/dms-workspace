import { FastifyRequest } from 'fastify';

import { AuthenticatedRequest } from './authenticated-request.interface';

export function isAuthenticated(
  request: FastifyRequest
): request is AuthenticatedRequest {
  return (
    'user' in request &&
    typeof (request as AuthenticatedRequest).user === 'object'
  );
}
