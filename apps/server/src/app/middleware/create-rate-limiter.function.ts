import { FastifyReply, FastifyRequest } from 'fastify';

import { getClientKey } from './get-client-key.function';
import { handleRateLimitExceeded } from './handle-rate-limit-exceeded.function';
import { rateLimitConfigs } from './rate-limit-configs.constant';
import { RateLimitType } from './rate-limit-types.type';
import { setRateLimitHeaders } from './set-rate-limit-headers.function';
import { updateRateLimitEntry } from './update-rate-limit-entry.function';

export function createRateLimiter(
  type: RateLimitType
): (
  request: FastifyRequest,
  reply: FastifyReply,
  isSuccess?: boolean
) => Promise<boolean> {
  async function rateLimiterHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    isSuccess?: boolean
  ): Promise<boolean> {
    const config = rateLimitConfigs[type];
    const key = getClientKey(request, type);
    const entry = updateRateLimitEntry(key, config, isSuccess);

    // Check if rate limit is exceeded
    const isRateLimited = entry.count > config.maxRequests;

    // Set rate limit headers
    setRateLimitHeaders(reply, config, entry, isRateLimited);

    if (isRateLimited) {
      await handleRateLimitExceeded({ request, reply, config, entry, type });
      return true; // Rate limited
    }

    return false; // Not rate limited
  }

  return rateLimiterHandler;
}
