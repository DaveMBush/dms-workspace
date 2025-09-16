import { RateLimitConfig } from './rate-limit-config.interface';
import { RateLimitType } from './rate-limit-types.type';

export const rateLimitConfigs: Record<RateLimitType, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
    skipSuccessfulRequests: true,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    skipSuccessfulRequests: false,
    message: 'Too many password reset requests. Please try again later.',
  },
  tokenRefresh: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 refreshes per minute
    skipSuccessfulRequests: true,
    message: 'Too many token refresh requests. Please slow down.',
  },
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    skipSuccessfulRequests: true,
    message: 'Too many requests. Please slow down.',
  },
};
