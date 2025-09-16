import { FastifyReply, FastifyRequest } from 'fastify';

import { RateLimitConfig } from './rate-limit-config.interface';
import { RateLimitEntry } from './rate-limit-entry.interface';
import { RateLimitType } from './rate-limit-types.type';

interface RateLimitExceededParams {
  request: FastifyRequest;
  reply: FastifyReply;
  config: RateLimitConfig;
  entry: RateLimitEntry;
  type: RateLimitType;
}

export async function handleRateLimitExceeded(
  params: RateLimitExceededParams
): Promise<void> {
  const { request, reply, config, entry, type } = params;
  const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);

  request.log.warn(
    {
      ip: request.ip,
      rateLimitType: type,
      count: entry.count,
      maxRequests: config.maxRequests,
      failures: entry.failures,
      retryAfter,
      userAgent: request.headers['user-agent'],
    },
    'Rate limit exceeded'
  );

  await reply.code(429).send({
    error: 'Too Many Requests',
    message: config.message ?? 'Rate limit exceeded',
    retryAfter,
    type,
  });
}
