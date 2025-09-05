import { FastifyRequest } from 'fastify';

import { AuthenticatedUser } from '../types/auth.types';
import { isAuthenticated } from './is-authenticated.function';

export function getAuthenticatedUser(
  request: FastifyRequest
): AuthenticatedUser | null {
  return isAuthenticated(request) ? request.user : null;
}
