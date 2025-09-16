import { FastifyReply } from 'fastify';

import { RateLimitConfig } from './rate-limit-config.interface';
import { RateLimitEntry } from './rate-limit-entry.interface';

export function setRateLimitHeaders(
  reply: FastifyReply,
  config: RateLimitConfig,
  entry: RateLimitEntry,
  isExceeded: boolean
): void {
  reply.header('X-RateLimit-Limit', config.maxRequests.toString());

  if (isExceeded) {
    const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
    reply.header('Retry-After', retryAfter.toString());
    reply.header('X-RateLimit-Remaining', '0');
  } else {
    reply.header(
      'X-RateLimit-Remaining',
      Math.max(0, config.maxRequests - entry.count).toString()
    );
  }

  reply.header(
    'X-RateLimit-Reset',
    Math.ceil(entry.resetTime / 1000).toString()
  );
}
