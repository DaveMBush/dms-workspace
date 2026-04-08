import { describe, it, expect } from 'vitest';
import { validateCSRFToken } from './validate-csrf-token.middleware';

describe('validate-csrf-token.middleware (barrel re-export)', () => {
  it('re-exports validateCSRFToken', () => {
    expect(validateCSRFToken).toBeDefined();
    expect(typeof validateCSRFToken).toBe('function');
  });
});
