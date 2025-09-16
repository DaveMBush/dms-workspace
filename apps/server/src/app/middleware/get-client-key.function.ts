import { FastifyRequest } from 'fastify';

import { RateLimitType } from './rate-limit-types.type';

export function getClientKey(
  request: FastifyRequest,
  type: RateLimitType
): string {
  const ip = request.ip ?? 'unknown';
  const userAgent = request.headers['user-agent'] ?? 'unknown';
  // Create a hash of IP + User Agent for more specific rate limiting
  return `${type}:${ip}:${Buffer.from(userAgent)
    .toString('base64')
    .substring(0, 16)}`;
}
