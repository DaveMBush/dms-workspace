import { FastifyReply, FastifyRequest } from 'fastify';

import { createErrorResponse } from './create-error-response.function';
import { isRateLimited } from './is-rate-limited.function';

export async function handleRateLimiting(
  request: FastifyRequest,
  reply: FastifyReply,
  clientIP: string
): Promise<boolean> {
  if (isRateLimited(clientIP)) {
    request.log.warn(
      {
        clientIP,
        action: 'rate_limited',
        requestId: request.id,
      },
      'Client rate limited due to excessive authentication failures'
    );

    await reply
      .code(429)
      .send(
        createErrorResponse(
          'Too Many Requests',
          'Too many authentication failures. Please try again later.',
          request.id
        )
      );
    return true; // Rate limited
  }
  return false; // Not rate limited
}
