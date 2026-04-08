import { describe, it, expect } from 'vitest';
import { csrfProtectionHook } from './csrf-protection-hook.middleware';

describe('csrf-protection-hook.middleware (barrel re-export)', () => {
  it('re-exports csrfProtectionHook', () => {
    expect(csrfProtectionHook).toBeDefined();
    expect(typeof csrfProtectionHook).toBe('function');
  });
});
