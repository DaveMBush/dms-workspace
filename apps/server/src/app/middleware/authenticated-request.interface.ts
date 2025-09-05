import { FastifyRequest } from 'fastify';

import { AuthenticatedUser } from '../types/auth.types';

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
}
