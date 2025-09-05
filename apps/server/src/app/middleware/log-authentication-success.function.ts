import { FastifyRequest } from 'fastify';

import { AuthenticatedUser } from '../types/auth.types';

export function logAuthenticationSuccess(
  request: FastifyRequest,
  user: AuthenticatedUser,
  clientIP: string,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  request.log.info(
    {
      userId: user.sub,
      email: user.email,
      username: user.username,
      groups: user.groups,
      clientIP,
      duration,
      action: 'authenticated',
      requestId: request.id,
    },
    'User authenticated successfully'
  );
}
