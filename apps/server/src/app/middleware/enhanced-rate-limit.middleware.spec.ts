import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './enhanced-rate-limit.middleware';

describe('enhanced-rate-limit.middleware (barrel re-export)', () => {
  it('re-exports createRateLimiter', () => {
    expect(createRateLimiter).toBeDefined();
    expect(typeof createRateLimiter).toBe('function');
  });
});
