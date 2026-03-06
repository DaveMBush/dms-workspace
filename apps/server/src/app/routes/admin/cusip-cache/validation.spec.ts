import { describe, expect, test } from 'vitest';

import { isValidCusip } from './validation';

describe('validation', function () {
  describe('isValidCusip', function () {
    test('should accept valid 9-character alphanumeric CUSIP', function () {
      expect(isValidCusip('037833100')).toBe(true);
    });

    test('should accept CUSIP with letters', function () {
      expect(isValidCusip('88634T493')).toBe(true);
    });

    test('should reject too short', function () {
      expect(isValidCusip('0378331')).toBe(false);
    });

    test('should reject too long', function () {
      expect(isValidCusip('0378331001')).toBe(false);
    });

    test('should reject special characters', function () {
      expect(isValidCusip('03783-100')).toBe(false);
    });

    test('should reject empty string', function () {
      expect(isValidCusip('')).toBe(false);
    });
  });
});
