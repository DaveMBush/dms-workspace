import { FastifyReply, FastifyRequest } from 'fastify';

import { createRateLimiter } from './create-rate-limiter.function';
import { getClientKey } from './get-client-key.function';
import { rateLimitConfigs } from './rate-limit-configs.constant';
import { rateLimitStore } from './rate-limit-store.constant';

type RateLimitType = 'general' | 'login' | 'passwordReset' | 'tokenRefresh';

// Adaptive rate limiting based on failure patterns
export function createAdaptiveRateLimiter(
  type: RateLimitType
): (
  request: FastifyRequest,
  reply: FastifyReply,
  isSuccess?: boolean
) => Promise<boolean> {
  async function adaptiveRateLimitHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    isSuccess?: boolean
  ): Promise<boolean> {
    const baseConfig = rateLimitConfigs[type];
    const key = getClientKey(request, type);
    const entry = rateLimitStore.get(key);

    // Adjust limits based on failure rate
    const adjustedConfig = { ...baseConfig };

    if (entry && entry.failures > 0) {
      const failureRate = entry.failures / entry.count;

      // If failure rate > 50%, reduce max requests significantly
      if (failureRate > 0.5) {
        adjustedConfig.maxRequests = Math.max(
          1,
          Math.floor(baseConfig.maxRequests * 0.3)
        );
      } else if (failureRate > 0.3) {
        adjustedConfig.maxRequests = Math.max(
          2,
          Math.floor(baseConfig.maxRequests * 0.6)
        );
      }
    }

    // Use the regular rate limiter with adjusted config
    const originalConfig = rateLimitConfigs[type];
    rateLimitConfigs[type] = adjustedConfig;

    const result = await createRateLimiter(type)(request, reply, isSuccess);

    // Restore original config
    rateLimitConfigs[type] = originalConfig;

    return result;
  }

  return adaptiveRateLimitHandler;
}
