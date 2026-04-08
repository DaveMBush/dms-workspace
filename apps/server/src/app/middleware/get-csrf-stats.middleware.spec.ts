import { describe, it, expect } from 'vitest';
import { getCSRFStats } from './get-csrf-stats.middleware';

describe('get-csrf-stats.middleware (barrel re-export)', () => {
  it('re-exports getCSRFStats', () => {
    expect(getCSRFStats).toBeDefined();
    expect(typeof getCSRFStats).toBe('function');
  });
});
